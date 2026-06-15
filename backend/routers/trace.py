"""PyTrace — POST /trace endpoint."""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from models.schemas import TraceRequest, TraceResponse
from services.sandbox import SandboxViolation, MAX_CODE_LENGTH
from services.tracer import trace_code

router = APIRouter(prefix="/trace", tags=["trace"])


@router.post("", response_model=TraceResponse)
async def run_trace(request: Request, body: TraceRequest) -> TraceResponse:
    """Execute Python code in the sandbox and return a full execution trace.

    Args:
        request: FastAPI request object (reserved for rate-limiting middleware).
        body: TraceRequest with `code` and optional `inputs`.

    Returns:
        TraceResponse with `steps`, `total_steps`, and optional `error`.

    Raises:
        HTTPException 400: If code fails static validation.
        HTTPException 500: On unexpected server error.
    """
    if len(body.code) > MAX_CODE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Code exceeds maximum length of {MAX_CODE_LENGTH} characters",
        )

    try:
        steps, error, notes = trace_code(body.code, body.inputs)
    except SandboxViolation as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Internal tracer error: {exc}"
        ) from exc

    return TraceResponse(
        steps=steps,
        total_steps=len(steps),
        error=error,
        notes=notes,
    )
