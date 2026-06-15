"""PyTrace — POST /analyze endpoint.

Accepts Python code and returns Big-O complexity analysis via the Anthropic API.
"""

from fastapi import APIRouter, HTTPException, status

from models.schemas import AnalyzeRequest, AnalyzeResponse
from services.complexity import analyse_complexity

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("", response_model=AnalyzeResponse, status_code=status.HTTP_200_OK)
async def run_analyze(body: AnalyzeRequest) -> AnalyzeResponse:
    """Analyse the Big-O complexity of the submitted Python code.

    Args:
        body: Request containing the Python source code.

    Returns:
        AnalyzeResponse with time, space, pattern, explanation.

    Raises:
        422: If the request body is invalid.
        500: If the Anthropic API call fails or returns unparseable output.
    """
    if not body.code.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="code must not be empty",
        )

    try:
        return analyse_complexity(body.code)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
