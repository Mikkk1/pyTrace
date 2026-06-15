"""PyTrace — POST /snippets + GET /snippets/{token} endpoints.

Stores and retrieves shareable code snapshots via Supabase.
Each snippet gets a short random token used to hydrate state from the URL.
"""

import os
import secrets
import string

from fastapi import APIRouter, HTTPException, status
from supabase import create_client, Client

from models.schemas import SnippetCreateRequest, SnippetCreateResponse, SnippetData

router = APIRouter(prefix="/snippets", tags=["snippets"])

# Token alphabet: URL-safe characters only.
_ALPHABET = string.ascii_letters + string.digits
_TOKEN_LENGTH = 8


def _token() -> str:
    """Generate a cryptographically random URL-safe token."""
    return "".join(secrets.choice(_ALPHABET) for _ in range(_TOKEN_LENGTH))


def _get_client() -> Client:
    """Build a Supabase client from environment variables.

    Raises:
        RuntimeError: If the required env vars are missing.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set")
    return create_client(url, key)


# ---------------------------------------------------------------------------
# POST /snippets
# ---------------------------------------------------------------------------

@router.post("", response_model=SnippetCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_snippet(body: SnippetCreateRequest) -> SnippetCreateResponse:
    """Persist a code snapshot and return a shareable token + URL.

    Args:
        body: code, inputs dict, and the step index to restore.

    Returns:
        token: short alphanumeric identifier.
        url: full share URL pointing at the frontend.

    Raises:
        500: On Supabase write failure.
    """
    try:
        client = _get_client()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    tok = _token()
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
    frontend_url = allowed_origins.split(",")[0].rstrip("/")
    share_url = f"{frontend_url}?s={tok}"

    try:
        client.table("snippets").insert(
            {
                "token": tok,
                "code": body.code,
                "inputs": body.inputs,
                "initial_step": body.initial_step,
            }
        ).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save snippet: {exc}",
        ) from exc

    return SnippetCreateResponse(token=tok, url=share_url)


# ---------------------------------------------------------------------------
# GET /snippets/{token}
# ---------------------------------------------------------------------------

@router.get("/{token}", response_model=SnippetData)
async def get_snippet(token: str) -> SnippetData:
    """Retrieve a stored snippet by its token.

    Args:
        token: The short alphanumeric token from the share URL.

    Returns:
        SnippetData with code, inputs, and initial_step.

    Raises:
        404: If no snippet exists for the given token.
        500: On Supabase read failure.
    """
    try:
        client = _get_client()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    try:
        result = (
            client.table("snippets")
            .select("code, inputs, initial_step")
            .eq("token", token)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch snippet: {exc}",
        ) from exc

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Snippet '{token}' not found",
        )

    row = result.data[0]
    return SnippetData(
        code=row["code"],
        inputs=row["inputs"],
        initial_step=row["initial_step"],
    )
