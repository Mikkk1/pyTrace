"""PyTrace -- Complexity analysis via any OpenAI-compatible LLM API.

Works with Groq, OpenRouter, OpenAI, or any provider that follows the
OpenAI chat completions format. Configure via environment variables:

  LLM_API_KEY   -- your API key (required)
  LLM_BASE_URL  -- base URL for the provider (required for non-OpenAI)
  LLM_MODEL     -- model name to use (required for non-OpenAI)

Examples:
  Groq:       LLM_BASE_URL=https://api.groq.com/openai/v1
              LLM_MODEL=llama-3.3-70b-versatile
  OpenRouter: LLM_BASE_URL=https://openrouter.ai/api/v1
              LLM_MODEL=anthropic/claude-3-haiku
  OpenAI:     LLM_BASE_URL=https://api.openai.com/v1
              LLM_MODEL=gpt-4o-mini
"""

import json
import os
import re
from typing import Any

from openai import OpenAI

from models.schemas import AnalyzeResponse

# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

_SYSTEM = (
    "You are a computer-science expert specialising in algorithm analysis. "
    "Given Python code, respond ONLY with a JSON object -- no markdown, no prose. "
    "The JSON must have exactly these four string keys:\n"
    '  "time"        -- Big-O time complexity (e.g. "O(n log n)")\n'
    '  "space"       -- Big-O space complexity (e.g. "O(n)")\n'
    '  "pattern"     -- algorithm pattern name (e.g. "Two Pointers", "Divide & Conquer")\n'
    '  "explanation" -- 2-3 sentence plain-English explanation of WHY the complexities hold'
)


def _build_prompt(code: str) -> str:
    return f"Analyse this Python code:\n\n```python\n{code}\n```"


# ---------------------------------------------------------------------------
# Public function
# ---------------------------------------------------------------------------


def analyse_complexity(code: str) -> AnalyzeResponse:
    """Call an OpenAI-compatible LLM API and return a parsed AnalyzeResponse.

    Reads LLM_API_KEY, LLM_BASE_URL, LLM_MODEL from environment.
    Falls back to ANTHROPIC_API_KEY for backwards compatibility.

    Raises:
        ValueError: Missing config or unparseable response.
        openai.APIError: Propagated on network/auth errors.
    """
    api_key = os.getenv("LLM_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("LLM_API_KEY environment variable is not set")

    base_url = os.getenv("LLM_BASE_URL") or os.getenv("ANTHROPIC_BASE_URL")
    model = os.getenv("LLM_MODEL") or os.getenv("ANTHROPIC_MODEL", "gpt-4o-mini")

    client_kwargs: dict[str, Any] = {"api_key": api_key}
    if base_url:
        client_kwargs["base_url"] = base_url

    client = OpenAI(**client_kwargs)

    response = client.chat.completions.create(
        model=model,
        max_tokens=512,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": _build_prompt(code)},
        ],
    )

    raw: str = (response.choices[0].message.content or "").strip()

    # Strip optional markdown code fences
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        data: dict[str, Any] = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Model returned non-JSON response: {raw[:200]}") from exc

    required = {"time", "space", "pattern", "explanation"}
    missing = required - data.keys()
    if missing:
        raise ValueError(f"Model JSON missing keys: {missing}")

    return AnalyzeResponse(
        time=str(data["time"]),
        space=str(data["space"]),
        pattern=str(data["pattern"]),
        explanation=str(data["explanation"]),
    )
