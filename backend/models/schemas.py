"""PyTrace — Pydantic request/response models."""

from typing import Any
from pydantic import BaseModel, Field


class TraceRequest(BaseModel):
    """Request body for POST /trace."""

    code: str = Field(..., description="Python source code to trace")
    inputs: dict[str, Any] = Field(
        default_factory=dict,
        description="Named arguments injected into the execution namespace",
    )


class StackFrame(BaseModel):
    """A single frame in the Python call stack."""

    name: str
    line: int
    depth: int


class TraceStep(BaseModel):
    """State snapshot captured at a single trace event."""

    line: int
    locals: dict[str, Any]
    call_stack: list[StackFrame]
    event: str  # 'line' | 'call' | 'return' | 'exception'
    return_value: Any = None
    changed_vars: list[str] = Field(default_factory=list)


class TraceResponse(BaseModel):
    """Response body for POST /trace."""

    steps: list[TraceStep]
    total_steps: int
    error: str | None = None
    notes: list[str] = Field(
        default_factory=list,
        description="Human-readable list of preprocessing transformations applied",
    )


# ---------------------------------------------------------------------------
# /analyze
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    """Request body for POST /analyze."""

    code: str = Field(..., description="Python source code to analyse")


class AnalyzeResponse(BaseModel):
    """Response body for POST /analyze."""

    time: str = Field(..., description="Time complexity, e.g. O(n log n)")
    space: str = Field(..., description="Space complexity, e.g. O(n)")
    pattern: str = Field(..., description="Algorithm pattern, e.g. Two Pointers")
    explanation: str = Field(..., description="Plain-English Big-O explanation")


# ---------------------------------------------------------------------------
# /snippets
# ---------------------------------------------------------------------------

class SnippetCreateRequest(BaseModel):
    """Request body for POST /snippets."""

    code: str
    inputs: dict[str, Any] = Field(default_factory=dict)
    initial_step: int = Field(default=0, ge=0)


class SnippetCreateResponse(BaseModel):
    """Response body for POST /snippets."""

    token: str
    url: str


class SnippetData(BaseModel):
    """Response body for GET /snippets/{token}."""

    code: str
    inputs: dict[str, Any]
    initial_step: int
