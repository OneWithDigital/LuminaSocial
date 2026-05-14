"""
AI Brand Guardrail
Loads brand_guidelines.md and calls the Anthropic API to score a
draft caption + visual style description against the brand rules.

Returns a BrandCheckResult with a 0-100 score, per-section sub-scores,
revision suggestions, and explanatory notes.
"""

from dataclasses import dataclass, field
from pathlib import Path
import json
import anthropic
from config import get_settings


GUIDELINES_PATH = Path(__file__).parent.parent.parent.parent / "brand_guidelines.md"


@dataclass
class BrandCheckResult:
    score: float                            # 0–100
    passed: bool                            # score >= guardrail_min_score
    auto_rejected: bool                     # score < guardrail_auto_reject_below
    notes: str                              # LLM overall summary
    sub_scores: dict[str, int] = field(default_factory=dict)
    revision_suggestions: list[str] = field(default_factory=list)


def _load_guidelines() -> str:
    return GUIDELINES_PATH.read_text(encoding="utf-8")


async def check_brand_alignment(
    caption: str,
    visual_style: str,
    platform: str,
) -> BrandCheckResult:
    settings = get_settings()
    guidelines = _load_guidelines()

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    system_prompt = f"""You are the brand guardian for LuminaSocial.
Your job is to score social media content against the brand guidelines provided below.

<brand_guidelines>
{guidelines}
</brand_guidelines>

Respond ONLY in this exact JSON format (no markdown, no extra text):
{{
  "score": <integer 0-100>,
  "sub_scores": {{
    "tone": <integer 0-25>,
    "prohibited": <integer 0-25>,
    "structure": <integer 0-20>,
    "platform_fit": <integer 0-15>,
    "visual_style": <integer 0-15>
  }},
  "revision_suggestions": ["<specific actionable fix>"],
  "notes": "<overall summary of deductions, or 'All checks passed.' if full marks>"
}}

revision_suggestions must be an empty array [] if score >= 70, otherwise provide 2-4 specific actionable fixes."""

    user_message = f"""Please score the following content:

Platform: {platform}
Visual Style: {visual_style}

Caption:
{caption}"""

    message = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=512,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    result = json.loads(message.content[0].text)
    score = float(result.get("score", 0))

    raw_sub = result.get("sub_scores", {})
    sub_scores: dict[str, int] = {
        "tone": int(raw_sub.get("tone", 0)),
        "prohibited": int(raw_sub.get("prohibited", 0)),
        "structure": int(raw_sub.get("structure", 0)),
        "platform_fit": int(raw_sub.get("platform_fit", 0)),
        "visual_style": int(raw_sub.get("visual_style", 0)),
    }

    raw_suggestions = result.get("revision_suggestions", [])
    revision_suggestions: list[str] = (
        list(raw_suggestions) if isinstance(raw_suggestions, list) else []
    )

    return BrandCheckResult(
        score=score,
        passed=score >= settings.guardrail_min_score,
        auto_rejected=score < settings.guardrail_auto_reject_below,
        notes=result.get("notes", ""),
        sub_scores=sub_scores,
        revision_suggestions=revision_suggestions,
    )
