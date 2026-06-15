"""PyTrace — Execution tracer engine.

Uses sys.settrace() to capture variable state, call stack, and return values
at every line/call/return event during user code execution.

Design:
  - validate_code() + build_restricted_globals() from sandbox.py gate input
  - A threading.Timer enforces EXECUTION_TIMEOUT
  - MAX_STEPS caps trace length to prevent infinite-loop DoS
  - All frame locals are deep-copied then serialized to JSON-safe primitives
  - Call stack is maintained INCREMENTALLY via trace events (call/return),
    NOT by walking frame.f_back — this avoids leaking internal frames from
    FastAPI, uvicorn, or the test harness.
"""

import sys
import copy
import threading
import types
from collections import Counter, deque
from typing import Any

from services.sandbox import (
    EXECUTION_TIMEOUT,
    MAX_STEPS,
    SandboxViolation,
    build_restricted_globals,
    validate_code,
)
from models.schemas import RecursionNode, StackFrame, TraceStep


# ---------------------------------------------------------------------------
# Serialization helpers
# ---------------------------------------------------------------------------

_MAX_COLLECTION_LENGTH = 200
_MAX_STRING_LENGTH = 500

# Cap on recursion-tree nodes built during tracing, to keep the response
# payload bounded for deeply recursive code (e.g. unmemoized fib(20)).
# The frontend further caps the *displayed* tree at 30 nodes / depth 6.
_MAX_RECURSION_NODES = 200


def _serialize(value: Any, depth: int = 0) -> Any:
    """Recursively convert a Python value to a JSON-serializable form.

    Args:
        value: Arbitrary Python object from frame locals.
        depth: Current recursion depth (stops at 6 to avoid stack overflow).

    Returns:
        A JSON-safe primitive: str, int, float, bool, None, list, or dict.
    """
    if depth > 6:
        return "<...>"

    if value is None or isinstance(value, (bool, int, float)):
        return value

    if isinstance(value, str):
        if len(value) > _MAX_STRING_LENGTH:
            return value[:_MAX_STRING_LENGTH] + "…"
        return value

    if isinstance(value, deque):
        items = [_serialize(v, depth + 1) for v in list(value)[:_MAX_COLLECTION_LENGTH]]
        return {"__type__": "deque", "items": items}

    if isinstance(value, (list, tuple)):
        items = [_serialize(v, depth + 1) for v in value[:_MAX_COLLECTION_LENGTH]]
        if len(value) > _MAX_COLLECTION_LENGTH:
            items.append(f"… +{len(value) - _MAX_COLLECTION_LENGTH} more")
        if isinstance(value, tuple):
            return {"__type__": "tuple", "items": items}
        return items

    # Counter is a dict subclass — check before the generic dict branch so it
    # renders as char:count badges instead of plain key->value rows.
    if isinstance(value, Counter):
        truncated = dict(list(value.items())[:_MAX_COLLECTION_LENGTH])
        return {
            "__type__": "counter",
            "items": {str(k): _serialize(v, depth + 1) for k, v in truncated.items()},
        }

    if isinstance(value, dict):
        truncated = dict(list(value.items())[:_MAX_COLLECTION_LENGTH])
        return {str(k): _serialize(v, depth + 1) for k, v in truncated.items()}

    if isinstance(value, set):
        items = [_serialize(v, depth + 1) for v in list(value)[:_MAX_COLLECTION_LENGTH]]
        return {"__type__": "set", "items": items}

    if isinstance(value, frozenset):
        items = [_serialize(v, depth + 1) for v in list(value)[:_MAX_COLLECTION_LENGTH]]
        return {"__type__": "frozenset", "items": items}

    rep = repr(value)
    if len(rep) > _MAX_STRING_LENGTH:
        rep = rep[:_MAX_STRING_LENGTH] + "…"
    return rep


# Types whose repr is not useful as a "value" — functions, methods, classes,
# modules. These are filtered out of locals entirely (Phase 7 Bug 1) so the
# COLLECTIONS/VARIABLES panels never show e.g. `characterReplacement` as a
# fake `str(49)` entry.
_NON_DATA_TYPE_NAMES = frozenset({
    "function",
    "method",
    "builtin_function_or_method",
    "type",
    "module",
})


def _is_data_variable(name: str, value: Any, current_fn_name: str) -> bool:
    """Return False for variables that aren't user "data" (Phase 7 Bug 1).

    Excludes: dunder names, the traced function's own name, callables
    (functions/methods/builtins/classes), and imported modules.
    """
    if name.startswith("__") and name.endswith("__"):
        return False
    if name == current_fn_name:
        return False
    if isinstance(value, types.ModuleType):
        return False
    if callable(value):
        return False
    if type(value).__name__ in _NON_DATA_TYPE_NAMES:
        return False
    return True


# ---------------------------------------------------------------------------
# Tracer core
# ---------------------------------------------------------------------------

class _TimeoutError(Exception):
    """Raised inside the traced thread when the execution timer fires."""


class PyTracer:
    """Stateful tracer that collects steps via sys.settrace().

    The call stack is maintained incrementally:
      - On 'call' event for a user-code frame: push a new StackFrame.
      - On 'return' event for a user-code frame: pop after recording the step.
    This avoids walking frame.f_back, which would include unrelated FastAPI /
    uvicorn frames in environments where everything runs in one process.
    """

    def __init__(self) -> None:
        self._steps: list[TraceStep] = []
        self._prev_locals: dict[str, Any] = {}
        self._timed_out = False
        self._step_limit_hit = False
        # Incrementally maintained user-code call stack.
        # _user_stack[0] is the OUTERMOST frame (<module>),
        # _user_stack[-1] is the CURRENT innermost frame.
        self._user_stack: list[tuple[str, int]] = []  # (name, line)
        # Recursion/call tree, built incrementally from call/return events.
        # _recursion_stack mirrors _user_stack but holds RecursionNode refs
        # (or None once _MAX_RECURSION_NODES is exceeded, as a placeholder
        # so push/pop stay balanced).
        self._recursion_root: RecursionNode | None = None
        self._recursion_stack: list[RecursionNode | None] = []
        self._recursion_node_count = 0

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------

    def run(self, code: str, inputs: dict[str, Any]) -> tuple[list[TraceStep], str | None, RecursionNode | None]:
        """Execute *code* under sys.settrace() and return captured steps.

        Args:
            code: Python source code (already validated by sandbox).
            inputs: Variables to inject into the execution namespace.

        Returns:
            Tuple of (steps, error_string_or_None, recursion_tree_or_None).
        """
        validate_code(code)
        restricted_globals = build_restricted_globals(inputs)

        self._steps = []
        self._prev_locals = {}
        self._timed_out = False
        self._step_limit_hit = False
        self._user_stack = []
        self._recursion_root = None
        self._recursion_stack = []
        self._recursion_node_count = 0

        timer = threading.Timer(EXECUTION_TIMEOUT, self._trigger_timeout)
        timer.daemon = True
        error: str | None = None

        try:
            timer.start()
            sys.settrace(self._trace_dispatch)
            try:
                exec(code, restricted_globals)  # noqa: S102
            except _TimeoutError:
                error = f"Execution timed out after {EXECUTION_TIMEOUT}s"
            except SandboxViolation as exc:
                error = f"Security violation: {exc}"
            except Exception as exc:
                error = f"{type(exc).__name__}: {exc}"
            finally:
                sys.settrace(None)
        finally:
            timer.cancel()

        if self._timed_out and error is None:
            error = f"Execution timed out after {EXECUTION_TIMEOUT}s"
        if self._step_limit_hit and error is None:
            error = f"Trace truncated: exceeded {MAX_STEPS} steps"

        return self._steps, error, self._recursion_root

    # ------------------------------------------------------------------
    # Private
    # ------------------------------------------------------------------

    def _trigger_timeout(self) -> None:
        """Called by threading.Timer; sets flag checked in _trace_dispatch."""
        self._timed_out = True

    def _snapshot_call_stack(self) -> list[StackFrame]:
        """Convert _user_stack to StackFrame list, innermost first (index 0)."""
        result = []
        for i, (name, line) in enumerate(reversed(self._user_stack)):
            result.append(StackFrame(name=name, line=line, depth=i))
        return result

    def _trace_dispatch(self, frame: Any, event: str, arg: Any) -> Any:
        """sys.settrace callback — called for every trace event.

        Args:
            frame: Current execution frame.
            event: One of 'call', 'line', 'return', 'exception'.
            arg: Event-specific value (return value, exception info).

        Returns:
            Self to keep tracing, or None to stop.
        """
        if self._timed_out:
            raise _TimeoutError()

        if len(self._steps) >= MAX_STEPS:
            self._step_limit_hit = True
            sys.settrace(None)
            return None

        if event not in ("line", "call", "return", "exception"):
            return self._trace_dispatch

        # Only trace user-code frames (exec gives them filename '<string>').
        if frame.f_code.co_filename != "<string>":
            return self._trace_dispatch

        # ── Maintain incremental call stack ───────────────────────────
        if event == "call":
            self._user_stack.append((frame.f_code.co_name, frame.f_lineno))
        elif event in ("line", "exception") and self._user_stack:
            # Update current frame's line number in-place.
            name, _ = self._user_stack[-1]
            self._user_stack[-1] = (name, frame.f_lineno)

        # ── Serialize locals ──────────────────────────────────────────
        try:
            raw_locals = copy.deepcopy(frame.f_locals)
        except Exception:
            raw_locals = {}

        serialized_locals: dict[str, Any] = {
            k: _serialize(v)
            for k, v in raw_locals.items()
            if _is_data_variable(k, v, frame.f_code.co_name)
        }

        changed_vars = [
            k for k, v in serialized_locals.items()
            if self._prev_locals.get(k) != v
        ]

        return_value = None
        if event == "return":
            try:
                return_value = _serialize(arg)
            except Exception:
                return_value = None

        # Snapshot call stack before popping on return.
        call_stack = self._snapshot_call_stack()

        step = TraceStep(
            line=frame.f_lineno,
            locals=serialized_locals,
            call_stack=call_stack,
            event=event,
            return_value=return_value,
            changed_vars=changed_vars,
        )
        self._steps.append(step)
        self._prev_locals = serialized_locals.copy()

        # ── Maintain recursion/call tree ────────────────────────────────
        if event == "call":
            self._push_recursion_node(
                fn_name=frame.f_code.co_name,
                args=serialized_locals,
                depth=len(self._user_stack) - 1,
                step_index=len(self._steps) - 1,
            )
        elif event == "return":
            self._pop_recursion_node(return_value)

        # Pop frame AFTER recording the step (so return shows the function).
        if event == "return" and self._user_stack:
            self._user_stack.pop()

        return self._trace_dispatch

    def _push_recursion_node(self, fn_name: str, args: dict[str, Any], depth: int, step_index: int) -> None:
        """Add a new node to the recursion tree on a 'call' event."""
        if self._recursion_node_count >= _MAX_RECURSION_NODES:
            self._recursion_stack.append(None)
            return

        node = RecursionNode(fn_name=fn_name, args=args, depth=depth, step_index=step_index)
        self._recursion_node_count += 1

        if self._recursion_stack:
            parent = self._recursion_stack[-1]
            if parent is not None:
                parent.children.append(node)
        else:
            self._recursion_root = node

        self._recursion_stack.append(node)

    def _pop_recursion_node(self, return_value: Any) -> None:
        """Record the return value for the node opened by 'call' on a 'return' event."""
        if self._recursion_stack:
            node = self._recursion_stack.pop()
            if node is not None:
                node.return_value = return_value


# ---------------------------------------------------------------------------
# Module-level convenience function
# ---------------------------------------------------------------------------

def trace_code(
    code: str,
    inputs: dict[str, Any],
) -> tuple[list[TraceStep], str | None, list[str], RecursionNode | None]:
    """
    Preprocess (strip self/cls, type annotations, fix call site), then trace.

    Returns:
        (steps, error_or_None, preprocessing_notes, recursion_tree_or_None)
    """
    from services.preprocessor import preprocess  # local import avoids circular
    processed_code, notes = preprocess(code)
    tracer = PyTracer()
    steps, error, recursion_tree = tracer.run(processed_code, inputs)
    return steps, error, notes, recursion_tree
