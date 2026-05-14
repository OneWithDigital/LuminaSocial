"""
AI Brand Guardrail
Loads brand_guidelines.md and calls the Anthropic API to score a
draft caption + visual style description against the brand rules.

Returns a BrandCheckResult with a 0-100 score and explanatory notes.
Phase 3 will add: per-section sub-scores, revision suggestions, and caching.
"""

from dataclasses import dataclass
from pathlib import Path
import anthropic
from config import get_settings


GUIDELINES_PATH = Path(__file__).parent.parent.parent.parent / "brand_guidelines.md"


@dataclass
class BrandCheckResult:
    score: float          # 0–100
    passed: bool          # score >= guardrail_min_score
    auto_rejected: bool   # score < guardrail_auto_reject_below
    notes: str            # LLM explanation


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
  "tone_score": <integer 0-25>,
  "prohibited_score": <integer 0-25>,
  "structure_score": <integer 0-20>,
  "platform_fit_score": <integer 0-15>,
  "visual_style_score": <integer 0-15>,
  "notes": "<concise explanation of deductions, or 'All checks passed.' if full marks>"
}}"""

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

    import json
    result = json.loads(message.content[0].text)
    score = float(result["score"])

    return BrandCheckResult(
        score=score,
        passed=score >= settings.guardrail_min_score,
        auto_rejected=score < settings.guardrail_auto_reject_below,
        notes=result.get("notes", ""),
    )
