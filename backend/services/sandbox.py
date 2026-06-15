"""PyTrace — Sandbox security layer.

Validates user code before execution and provides a restricted globals
namespace that blocks dangerous builtins and imports.
"""

import builtins
from typing import Any

# ---------------------------------------------------------------------------
# Security constants (non-negotiable per ARCHITECTURE.md)
# ---------------------------------------------------------------------------

BLOCKED_MODULES: frozenset[str] = frozenset([
    "os",
    "subprocess",
    "sys",
    "socket",
    "shutil",
    "pathlib",
    "importlib",
    "ctypes",
    "multiprocessing",
    "threading",
    "signal",
    "pty",
    "termios",
    "resource",
    "gc",
    "weakref",
    "inspect",
    "dis",
    "ast",
    "tokenize",
    "pickle",
    "shelve",
    "tempfile",
    "glob",
    "fnmatch",
    "io",
    "zipfile",
    "tarfile",
    "gzip",
    "bz2",
    "lzma",
    "zlib",
    "ssl",
    "http",
    "urllib",
    "ftplib",
    "smtplib",
    "email",
    "xml",
    "html",
    "sqlite3",
    "dbm",
    "csv",
    "configparser",
    "logging",
    "unittest",
    "pdb",
    "profile",
    "cProfile",
    "timeit",
    "trace",
    "code",
    "codeop",
    "compileall",
    "py_compile",
    "zipimport",
    "pkgutil",
    "platform",
    "sysconfig",
    "site",
    "syslog",
    "msvcrt",
    "winreg",
    "winsound",
    "posix",
    "pwd",
    "grp",
    "tty",
    "pty",
    "fcntl",
    "pipes",
    "select",
    "selectors",
    "asyncio",
    "concurrent",
    "mmap",
    "ctypes",
    "cffi",
    "ffi",
    "builtins",
    "_thread",
    "thread",
    "antigravity",
    "this",
])

BLOCKED_BUILTINS: frozenset[str] = frozenset([
    "open",
    "eval",
    "exec",
    "compile",
    "__import__",
    "breakpoint",
    "input",
    "print",   # allow later if needed — suppressed for now to keep traces clean
    "quit",
    "exit",
    "help",
    "credits",
    "license",
    "copyright",
    "memoryview",
])

MAX_CODE_LENGTH: int = 5_000       # characters
EXECUTION_TIMEOUT: int = 5         # seconds
MAX_STEPS: int = 10_000            # prevent infinite loops
RATE_LIMIT: int = 20               # requests per IP per minute


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


class SandboxViolation(Exception):
    """Raised when user code fails a pre-execution security check."""


def validate_code(code: str) -> None:
    """Raise SandboxViolation if the code string violates static constraints.

    This is a fast pre-check before we even attempt execution.
    It does NOT replace runtime restrictions — both layers are required.

    Args:
        code: Raw Python source code from the user.

    Raises:
        SandboxViolation: If the code is too long or contains obvious
            disallowed patterns.
    """
    if len(code) > MAX_CODE_LENGTH:
        raise SandboxViolation(
            f"Code too long: {len(code)} chars (max {MAX_CODE_LENGTH})"
        )

    if not code.strip():
        raise SandboxViolation("Code is empty")

    # Detect blocked module imports via naive text scan.
    # Runtime __import__ restriction is the real guard; this gives fast feedback.
    for module in BLOCKED_MODULES:
        # Match "import os", "import os.path", "from os import ..."
        patterns = [
            f"import {module}",
            f"from {module}",
            f"import {module}.",
        ]
        for pattern in patterns:
            if pattern in code:
                raise SandboxViolation(f"Module '{module}' is not allowed")


def build_restricted_globals(inputs: dict[str, Any]) -> dict[str, Any]:
    """Return a restricted globals dict for use with exec().

    Allowed builtins are an explicit whitelist; everything else is stripped.
    User inputs are merged in at the top level so they're available as names.

    Args:
        inputs: Dict of variable name → value to inject (e.g. {'nums': [1,2,3]}).

    Returns:
        A dict suitable for passing as `globals` to exec() / sys.settrace().
    """
    allowed_builtin_names = {
        name
        for name in dir(builtins)
        if name not in BLOCKED_BUILTINS
        and not name.startswith("__")
    }

    safe_builtins: dict[str, Any] = {
        name: getattr(builtins, name)
        for name in allowed_builtin_names
        if hasattr(builtins, name)
    }

    # Provide a safe __import__ that blocks forbidden modules.
    original_import = builtins.__import__

    def safe_import(
        name: str,
        globals: Any = None,
        locals: Any = None,
        fromlist: tuple = (),
        level: int = 0,
    ) -> Any:
        """Restricted __import__ that blocks BLOCKED_MODULES."""
        root = name.split(".")[0]
        if root in BLOCKED_MODULES:
            raise ImportError(f"Module '{root}' is not allowed in PyTrace")
        return original_import(name, globals, locals, fromlist, level)

    safe_builtins["__import__"] = safe_import

    restricted: dict[str, Any] = {
        "__builtins__": safe_builtins,
        "__name__": "__pytrace__",
        "__doc__": None,
    }
    restricted.update(inputs)
    return restricted
