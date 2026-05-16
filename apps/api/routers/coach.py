"""
AI Coach — analyzes recent posts, lessons learned, and brand voice
to return specific, actionable content improvement suggestions.
"""
import json
import re
from typing import Optional

import anthropic
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.connection import get_db
from config import get_settings

router = APIRouter()


class CoachSuggestion(BaseModel):
    platform: Optional[str]   # None = applies to all platforms
    headline: str
    detail: str
    action: str


class CoachReport(BaseModel):
    overall_insight: str
    suggestions: list[CoachSuggestion]
    analyzed_posts: int
    analyzed_lessons: int


@router.post("/analyze", response_model=CoachReport)
async def analyze(db: AsyncSession = Depends(get_db)):
    cfg = get_settings()

    # Fetch brand profile
    profile_row = (await db.execute(
        text("SELECT brand_voice, brand_keywords FROM user_profiles ORDER BY id LIMIT 1")
    )).mappings().first()
    brand_voice    = profile_row["brand_voice"]    if profile_row else None
    brand_keywords = profile_row["brand_keywords"] if profile_row else []

    # Fetch last 15 posts
    posts_result = await db.execute(text("""
        SELECT title, caption_draft, platform_target, status, brand_alignment_score, created_at
        FROM posts ORDER BY created_at DESC LIMIT 15
    """))
    posts = [dict(r) for r in posts_result.mappings().fetchall()]

    # Fetch all lessons
    lessons_result = await db.execute(text("""
        SELECT summary, winning_style, winning_platform, engagement_delta
        FROM lessons_learned ORDER BY created_at DESC LIMIT 20
    """))
    lessons = [dict(r) for r in lessons_result.mappings().fetchall()]

    # Build prompt context
    brand_block = ""
    if brand_voice:
        brand_block += f"Brand voice: {brand_voice}\n"
    if brand_keywords:
        brand_block += f"Brand keywords: {', '.join(brand_keywords)}\n"

    posts_block = "No posts yet." if not posts else "\n".join(
        f"- [{p['platform_target']}] {p['title']} | status={p['status']} | score={p['brand_alignment_score'] or 'N/A'}"
        + (f"\n  Caption preview: {p['caption_draft'][:120]}…" if p['caption_draft'] else "")
        for p in posts
    )

    lessons_block = "No analytics lessons yet." if not lessons else "\n".join(
        f"- {l['summary']}"
        + (f" | winner={l['winning_style']} on {l['winning_platform']}" if l['winning_style'] else "")
        + (f" | delta={round(l['engagement_delta']*100,1)}%" if l['engagement_delta'] else "")
        for l in lessons
    )

    prompt = f"""You are a top social media performance coach. Analyze this creator's content and give specific, actionable improvement tips based only on what you actually observe.

BRAND PROFILE:
{brand_block or "No brand profile set yet."}

RECENT POSTS ({len(posts)} total):
{posts_block}

LESSONS FROM A/B ANALYTICS:
{lessons_block}

Return ONLY a valid JSON object, no markdown:
{{
  "overall_insight": "2-3 sentence summary of what you observe — what's strong, what needs work",
  "suggestions": [
    {{
      "platform": "instagram" | "tiktok" | "linkedin" | "twitter" | "youtube_shorts" | null,
      "headline": "short specific tip (under 10 words)",
      "detail": "why this matters for this creator based on what you see",
      "action": "one concrete thing to do in the next post"
    }}
  ]
}}

Rules:
- Give 4–6 suggestions
- Reference actual observed patterns, not generic advice
- platform=null means the tip applies to all platforms
- If data is limited, say so honestly and give foundational tips
- Be direct and specific, not vague"""

    client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = msg.content[0].text.strip()
    raw = re.sub(r"```[a-z]*\n?", "", raw).strip().rstrip("`")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {
            "overall_insight": "Could not parse AI response. Try again.",
            "suggestions": [],
        }

    return CoachReport(
        overall_insight=data.get("overall_insight", ""),
        suggestions=[CoachSuggestion(**s) for s in data.get("suggestions", [])],
        analyzed_posts=len(posts),
        analyzed_lessons=len(lessons),
    )
