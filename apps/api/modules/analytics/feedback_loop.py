"""
Analytics Feedback Loop
Reads engagement data from the `analytics` table, determines the
winning A/B variant, and writes a "Lessons Learned" summary to
`lessons_learned` using an LLM call.

Phase 4 will add: real platform API pulls, batch processing, and
prompt-bias injection into the video factory.
"""

from dataclasses import dataclass
import anthropic
from config import get_settings


@dataclass
class AnalyticsSummary:
    post_id: str
    variant_a_engagement: float
    variant_b_engagement: float
    winning_variant: str  # 'A' or 'B'
    engagement_delta: float


async def generate_lessons_learned(summary: AnalyticsSummary) -> dict:
    settings = get_settings()
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    winning_style = (
        "fast_aggressive" if summary.winning_variant == "A" else "cinematic_minimal"
    )

    prompt = f"""You are a social media performance analyst for LuminaSocial.

A/B test results for post {summary.post_id}:
- Variant A (fast/aggressive): engagement rate = {summary.variant_a_engagement:.4f}
- Variant B (cinematic/minimal): engagement rate = {summary.variant_b_engagement:.4f}
- Winner: Variant {summary.winning_variant} ({winning_style})
- Engagement delta: {summary.engagement_delta:+.4f}

Write a concise "Lessons Learned" entry (3-5 sentences) that:
1. States what worked and why
2. Suggests one specific prompt bias for the next generation run
3. Notes any caveats (sample size, platform context, etc.)

Then provide a JSON object called `recommended_bias` with these keys:
- prefer_style: "fast_aggressive" or "cinematic_minimal"
- hook_duration_sec: integer (3 or 5)
- caption_tone: one of ["urgent", "inspirational", "educational", "witty"]

Respond in this exact format:
SUMMARY: <your 3-5 sentence summary>
BIAS: <valid JSON object>"""

    message = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text
    summary_text = ""
    bias_json = {}

    import json, re
    if "SUMMARY:" in text and "BIAS:" in text:
        parts = text.split("BIAS:")
        summary_text = parts[0].replace("SUMMARY:", "").strip()
        bias_match = re.search(r"\{.*\}", parts[1], re.DOTALL)
        if bias_match:
            bias_json = json.loads(bias_match.group())

    return {
        "post_id": summary.post_id,
        "summary": summary_text,
        "winning_style": winning_style,
        "engagement_delta": summary.engagement_delta,
        "recommended_bias": bias_json,
    }
