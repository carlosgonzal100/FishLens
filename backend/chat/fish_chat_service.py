"""User Story 6.2 - Ask the AI Assistant About Fish.

All Claude API code lives here, not in views, so the model, prompt version,
timeout, and fallback are in one place and tests can pass in a fake client.
"""

import os
from pathlib import Path

import anthropic

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts" / "fish_chat"

# The prompt asks for under 120 words, which is well under 300 tokens.
MAX_TOKENS = 300

# Longer questions are refused before Claude is called, so one request can't
# use up a large share of the API credits.
MAX_QUESTION_CHARS = 500

# What the user sees when the AI can't give a usable answer.
FALLBACK_ANSWER = "Sorry, the AI assistant is unavailable right now. Please try again later."


def load_prompt(version):
    # Prompt files are never edited. A change is a new file, such as v2.txt.
    return (PROMPTS_DIR / f"{version}.txt").read_text(encoding="utf-8")


def make_client():
    # Reads ANTHROPIC_API_KEY from the environment. A slow reply can't hang the
    # request, and the library retries rate limits and dropped connections.
    return anthropic.Anthropic(timeout=10.0, max_retries=2)


def call_llm(client, question, version):
    model = os.environ.get("LLM_MODEL")
    if not model:
        raise ValueError("LLM_MODEL is not set")

    response = client.messages.create(
        model=model,
        max_tokens=MAX_TOKENS,
        system=load_prompt(version),
        # The tags separate the user's text from our instructions.
        messages=[{"role": "user", "content": f"<question>{question}</question>"}],
    )

    # A cut-off answer is treated as a failure, not shown to the user.
    if response.stop_reason == "max_tokens":
        raise ValueError("truncated answer")

    answer = "".join(block.text for block in response.content if block.type == "text").strip()
    if not answer:
        raise ValueError("empty answer")
    return answer


def answer_question(question, client=None):
    """Returns {"answer": ..., "source": ...}.

    source is "llm:<prompt version>" for a Claude answer, or "fallback" when
    the call fails, times out, or returns an unusable answer.
    """
    version = os.environ.get("FISH_CHAT_PROMPT_VERSION", "v1")
    try:
        client = client or make_client()
        answer = call_llm(client, question, version)
        return {"answer": answer, "source": f"llm:{version}"}
    except (anthropic.AnthropicError, ValueError):
        return {"answer": FALLBACK_ANSWER, "source": "fallback"}
