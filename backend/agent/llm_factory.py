import os
from crewai import LLM

"""
Central place to build the Gemini LLM for CrewAI.

Environment Variables:
- GEMINI_API_KEY (required)
- LLM_MODEL (optional) default: gemini/gemini-1.5-flash
  Accepted forms:
    gemini/gemini-1.5-flash
    gemini-1.5-flash      (will be auto-prefixed to gemini/)
    gemini/gemini-1.5-pro
    gemini-1.5-pro
- LLM_TEMPERATURE (optional) default 0.2
- LLM_MAX_TOKENS (optional) default 2048

To avoid accidental Vertex AI routing, we:
  1. Remove any leading/trailing whitespace.
  2. If model does NOT start with 'gemini/', we prefix it.
"""

def build_gemini_llm():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY not set. Export it before starting the server.\n"
            "Example: export GEMINI_API_KEY='your_key_here'"
        )

    raw_model = os.getenv("LLM_MODEL", "gemini/gemini-1.5-flash").strip()
    if not raw_model.startswith("gemini/"):
        raw_model = f"gemini/{raw_model}"

    # Optional explicit hard block on Vertex env if user did not intend Vertex
    if os.getenv("VERTEXAI_PROJECT") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        print(
            "[llm_factory] WARNING: VERTEXAI_PROJECT or GOOGLE_APPLICATION_CREDENTIALS is set. "
            "If you intend to use public Gemini API ONLY, unset these to avoid confusion."
        )

    temperature = float(os.getenv("LLM_TEMPERATURE", "0.2"))
    max_tokens = int(os.getenv("LLM_MAX_TOKENS", "2048"))

    llm = LLM(
        model=raw_model,
        api_key=api_key,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    print(
        f"[llm_factory] CrewAI Gemini LLM initialized -> model='{raw_model}', "
        f"temperature={temperature}, max_tokens={max_tokens}"
    )
    return llm