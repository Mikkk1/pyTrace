"""PyTrace -- LeetCode code preprocessor.

Transforms LeetCode-style class method code into runnable standalone code
before it reaches the tracer, so users can paste directly from LeetCode
without any manual edits.

Transformations (in order):
1. Unwrap class Solution wrapper -> top-level functions
2. Strip self / cls from parameter lists
3. Strip PEP 484 type annotations (List[int], Optional[...], -> int, etc.)
4. Auto-fix call site name mismatch
5. Auto-generate call site when none exists
"""

import re
import ast


# ---------------------------------------------------------------------------
# Helpers shared across steps
# ---------------------------------------------------------------------------

_SKIP_METHODS = frozenset({
    '__init__', '__str__', '__repr__', '__len__', '__eq__',
    '__hash__', '__lt__', '__le__', '__gt__', '__ge__',
})


# ---------------------------------------------------------------------------
# Step 1 -- unwrap class Solution
# ---------------------------------------------------------------------------

def _unwrap_class(code: str) -> tuple[str, bool]:
    """
    If every top-level statement is either a class definition or an import
    (typical LeetCode Solution submission, often preceded by
    `from typing import ...` / `from collections import ...`), extract
    non-dunder methods as top-level functions, keeping the leading imports.
    Returns (new_code, was_unwrapped).
    """
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return code, False

    top = tree.body
    class_nodes = [n for n in top if isinstance(n, ast.ClassDef)]
    import_nodes = [n for n in top if isinstance(n, (ast.Import, ast.ImportFrom))]
    if not class_nodes or len(class_nodes) + len(import_nodes) != len(top):
        return code, False

    lines = code.split('\n')
    output: list[str] = []

    for imp in import_nodes:
        output.extend(lines[imp.lineno - 1: imp.end_lineno])

    for cls in class_nodes:
        for item in cls.body:
            if not isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            if item.name in _SKIP_METHODS:
                continue
            method_lines = lines[item.lineno - 1: item.end_lineno]
            for ln in method_lines:
                if ln.startswith('    '):
                    output.append(ln[4:])
                elif ln.startswith('\t'):
                    output.append(ln[1:])
                else:
                    output.append(ln)
            output.append('')

    if not output:
        return code, False

    return '\n'.join(output), True


# ---------------------------------------------------------------------------
# Step 2 -- strip self / cls
# ---------------------------------------------------------------------------

def _strip_self_cls(code: str) -> str:
    """Remove self and cls from def parameter lists and method-call sites.

    Handles both `def foo(self, ...)` declarations and intra-class calls
    like `self.dfs(grid, i, j)`, which become bare `dfs(grid, i, j)` once
    the class wrapper is removed and methods become top-level functions.
    """
    code = re.sub(r'(\bdef\s+\w+\s*\(\s*)(?:self|cls)\s*,\s*', r'\1', code)
    code = re.sub(r'(\bdef\s+\w+\s*\(\s*)(?:self|cls)\s*\)', r'\1)', code)
    code = re.sub(r'\b(?:self|cls)\.(\w+)\s*\(', r'\1(', code)
    return code


# ---------------------------------------------------------------------------
# Step 3 -- strip type annotations
# ---------------------------------------------------------------------------

def _split_params(param_str: str) -> list[str]:
    """Split parameter string by commas, respecting bracket depth."""
    params: list[str] = []
    depth = 0
    current = ''
    for ch in param_str:
        if ch in '([{':
            depth += 1
            current += ch
        elif ch in ')]}':
            depth -= 1
            current += ch
        elif ch == ',' and depth == 0:
            params.append(current)
            current = ''
        else:
            current += ch
    if current.strip():
        params.append(current)
    return params


def _strip_param_annotation(param: str) -> str:
    """Strip the ': Type' part from a single parameter, keeping default values."""
    stars = ''
    rest = param
    if param.startswith('**'):
        stars, rest = '**', param[2:]
    elif param.startswith('*'):
        stars, rest = '*', param[1:]

    colon_pos = None
    depth = 0
    for idx, ch in enumerate(rest):
        if ch in '([{':
            depth += 1
        elif ch in ')]}':
            depth -= 1
        elif ch == ':' and depth == 0:
            colon_pos = idx
            break

    if colon_pos is None:
        return stars + rest

    name_part = rest[:colon_pos].strip()
    after_colon = rest[colon_pos + 1:]

    equals_pos = None
    depth = 0
    for idx, ch in enumerate(after_colon):
        if ch in '([{':
            depth += 1
        elif ch in ')]}':
            depth -= 1
        elif ch == '=' and depth == 0:
            equals_pos = idx
            break

    if equals_pos is not None:
        default = after_colon[equals_pos + 1:].strip()
        return f'{stars}{name_part} = {default}'
    return stars + name_part


def _strip_def_annotations(line: str) -> str:
    """Strip type annotations from a single def line."""
    paren_start = line.index('(')
    prefix = line[:paren_start + 1]

    depth = 1
    i = paren_start + 1
    while i < len(line) and depth > 0:
        if line[i] in '([{':
            depth += 1
        elif line[i] in ')]}':
            depth -= 1
        i += 1
    param_str = line[paren_start + 1: i - 1]
    suffix = line[i - 1:]

    suffix = re.sub(r'\)\s*->[^:]+:', '):', suffix)

    params = _split_params(param_str)
    clean_params = []
    for p in params:
        p = p.strip()
        if p:
            clean_params.append(_strip_param_annotation(p))

    return prefix + ', '.join(clean_params) + suffix


def _strip_annotations(code: str) -> str:
    """Strip type annotations from all def lines in the code."""
    lines = code.split('\n')
    result = []
    for line in lines:
        if re.match(r'^\s*def\s+\w+\s*\(', line):
            line = _strip_def_annotations(line)
        result.append(line)
    return '\n'.join(result)


# ---------------------------------------------------------------------------
# Step 4 -- fix call site name mismatch
# ---------------------------------------------------------------------------

def _fix_call_site(code: str) -> str:
    """
    If the last non-blank line calls a name that does not exist, but exactly
    one function IS defined, rewrite the call to use the correct name.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return code

    defined = {
        node.name for node in ast.walk(tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    }
    if not defined:
        return code

    lines = code.rstrip().split('\n')
    last_line = ''
    last_idx = -1
    for i in range(len(lines) - 1, -1, -1):
        stripped = lines[i].strip()
        if stripped and not stripped.startswith('#'):
            last_line = lines[i]
            last_idx = i
            break

    if last_idx == -1:
        return code

    # Only attempt a fix for top-level (unindented) lines.
    # Indented lines are inside a function/loop body and must not be touched.
    if last_line and last_line[0].isspace():
        return code

    try:
        last_tree = ast.parse(last_line.strip(), mode='eval')
    except SyntaxError:
        try:
            last_tree = ast.parse(last_line.strip())
        except SyntaxError:
            return code

    call_name: str | None = None
    for node in ast.walk(last_tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            call_name = node.func.id
            break

    if call_name is None or call_name in defined:
        return code

    if len(defined) == 1:
        correct_name = next(iter(defined))
        lines[last_idx] = lines[last_idx].replace(call_name, correct_name, 1)
        return '\n'.join(lines)

    return code


# ---------------------------------------------------------------------------
# Step 5 -- auto-generate call site when none exists
# ---------------------------------------------------------------------------

def _auto_add_call_site(code: str) -> tuple[str, bool]:
    """
    If no top-level call exists, generate one for the first non-dunder function.

    Param extraction uses AST exclusively — annotations and self/cls are already
    stripped by earlier pipeline steps, so arg.arg gives clean parameter names.
    Example: appends 'result = lengthOfLongestSubstring(s)'
    """
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return code, False

    func_nodes = [
        n for n in tree.body
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
        and n.name not in _SKIP_METHODS
    ]
    if not func_nodes:
        return code, False

    # Check for existing call site
    for node in tree.body:
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
            return code, False
        val = getattr(node, 'value', None)
        if val is not None and isinstance(val, ast.Call):
            return code, False

    fn_name = func_nodes[0].name
    params = [
        a.arg for a in func_nodes[0].args.args
        if a.arg not in ('self', 'cls')
    ]

    call_args = ', '.join(params)
    call_line = f'result = {fn_name}({call_args})'
    return code.rstrip('\n') + '\n' + call_line + '\n', True


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def preprocess(code: str) -> tuple[str, list[str]]:
    """
    Run all LeetCode compatibility transformations.

    Returns:
        (processed_code, list_of_notes)
    Notes describe what was changed so the frontend can inform the user.
    """
    notes: list[str] = []

    # 1. Unwrap class Solution (must be first)
    unwrapped, did_unwrap = _unwrap_class(code)
    if did_unwrap:
        code = unwrapped
        notes.append("Unwrapped class Solution")

    # 2. Strip self / cls
    before = code
    code = _strip_self_cls(code)
    if code != before:
        notes.append("Stripped 'self'/'cls'")

    # 3. Strip type annotations
    before = code
    code = _strip_annotations(code)
    if code != before:
        notes.append("Stripped type annotations")

    # 4. Fix wrong call site name
    before = code
    code = _fix_call_site(code)
    if code != before:
        notes.append("Auto-corrected call site")

    # 5. Auto-generate call site if missing
    with_call, did_add = _auto_add_call_site(code)
    if did_add:
        code = with_call
        notes.append("Auto-added call site")

    return code, notes
