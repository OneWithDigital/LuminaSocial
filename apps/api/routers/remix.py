"""
Content Remixer — takes any input (text or URL) and generates
platform-tailored post drafts for every connected social platform.
No publishing API required: drafts are returned for editing and
manual posting, or saved as Draft posts in the queue.
"""
import json
import re
from typing import Literal

import anthropic
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.connection import get_db
from config import get_settings

router = APIRouter()

# ── Platform constraints injected into the Claude prompt ──────────────────────

PLATFORM_RULES: dict[str, dict] = {
    "twitter": {
        "name": "Twitter / X",
        "char_limit": 280,
        "body_limit": 240,   # leave room for hashtags
        "tone": "punchy, hook-first, direct — every word earns its place",
        "hashtags": "1–2 only — include only if they add real value",
        "notes": "STRICT 280-character total limit. Short declarative sentences. No filler.",
    },
    "instagram": {
        "name": "Instagram",
        "char_limit": 2200,
        "body_limit": 2000,
        "tone": "engaging, story-driven, relatable — emojis used naturally, not spammed",
        "hashtags": "6–10 niche + broad hashtags on a new line at the very end",
        "notes": "Hook in the FIRST LINE (before 'more'). Use blank lines for breathing room.",
    },
    "linkedin": {
        "name": "LinkedIn",
        "char_limit": 3000,
        "body_limit": 2800,
        "tone": "professional but human — insight-led, value-driven, no corporate fluff",
        "hashtags": "3–5 professional industry hashtags at the end",
        "notes": "Open with a bold insight or provocative question. Short paragraphs. End with a question to drive comments.",
    },
    "tiktok": {
        "name": "TikTok",
        "char_limit": 2200,
        "body_limit": 2000,
        "tone": "trend-aware, energetic, conversational — like talking to a friend on camera",
        "hashtags": "4–6 hashtags including #fyp or #foryou",
        "notes": "First sentence is the scroll-stopper hook. Write exactly how you'd say it out loud.",
    },
    "youtube_shorts": {
        "name": "YouTube Shorts",
        "char_limit": 500,
        "body_limit": 450,
        "tone": "searchable, keyword-rich, clear value proposition",
        "hashtags": "3 relevant hashtags including #Shorts",
        "notes": "This is a video description. Front-load searchable keywords. State what the viewer will learn or see.",
    },
}


# ── Request / response models ──────────────────────────────────────────────────

class RemixRequest(BaseModel):
    input_type: Literal["text", "url"]
    content: str
    platforms: list[str] = list(PLATFORM_RULES.keys())


class PlatformDraft(BaseModel):
    platform: str
    platform_name: str
    body: str
    hashtags: list[str]
    char_limit: int


class RemixBundle(BaseModel):
    source_summary: str
    drafts: list[PlatformDraft]


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _fetch_url(url: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
        html = resp.text
        # Strip scripts, styles, tags
        text = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:5000]
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not fetch URL: {e}")


def _build_prompt(source: str, platforms: list[str], brand_voice: str | None, brand_keywords: list[str]) -> str:
    rules_block = "\n".join(
        f"""
=== {PLATFORM_RULES[p]["name"]} (key: "{p}") ===
Char limit: {PLATFORM_RULES[p]["char_limit"]} total | Body limit: {PLATFORM_RULES[p]["body_limit"]}
Tone: {PLATFORM_RULES[p]["tone"]}
Hashtags: {PLATFORM_RULES[p]["hashtags"]}
Notes: {PLATFORM_RULES[p]["notes"]}"""
        for p in platforms
        if p in PLATFORM_RULES
    )

    brand_block = ""
    if brand_voice:
        brand_block += f"\n\nBrand voice: {brand_voice}"
    if brand_keywords:
        brand_block += f"\nBrand keywords to weave in naturally: {', '.join(brand_keywords)}"

    return f"""You are a world-class social media strategist. Your job is to take source content and produce platform-native posts that feel crafted for each audience — not copy-pasted.

SOURCE CONTENT:
{source[:3000]}
{brand_block}

PLATFORM SPECS:
{rules_block}

OUTPUT — return ONLY a valid JSON object, no markdown fences, no explanation:
{{
  "source_summary": "one-sentence summary of the source content topic",
  "drafts": [
    {{
      "platform": "<platform key exactly as shown>",
      "platform_name": "<display name>",
      "body": "<post body WITHOUT hashtags>",
      "hashtags": ["hashtag1", "hashtag2"]
    }}
  ]
}}

Critical rules:
- body must NOT contain hashtags — they belong in the hashtags array
- body length must respect the body_limit for that platform
- Twitter body must be 240 chars or fewer (hard limit)
- Every post must feel native — not like a cross-post
- Return exactly one draft per requested platform"""


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=RemixBundle)
async def generate_remix(
    payload: RemixRequest,
    db: AsyncSession = Depends(get_db),
):
    cfg = get_settings()

    # Load brand context from profile
    row = (await db.execute(
        text("SELECT brand_voice, brand_keywords FROM user_profiles ORDER BY id LIMIT 1")
    )).mappings().first()
    brand_voice    = row["brand_voice"]    if row else None
    brand_keywords = row["brand_keywords"] if row else []

    # Fetch/use content
    source = await _fetch_url(payload.content) if payload.input_type == "url" else payload.content
    if not source.strip():
        raise HTTPException(status_code=422, detail="No content provided.")

    # Filter to valid requested platforms
    platforms = [p for p in payload.platforms if p in PLATFORM_RULES]
    if not platforms:
        raise HTTPException(status_code=422, detail="No valid platforms selected.")

    prompt = _build_prompt(source, platforms, brand_voice, brand_keywords)

    client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2500,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = msg.content[0].text.strip()
    # Strip markdown fences if model added them despite instructions
    raw = re.sub(r"```[a-z]*\n?", "", raw).strip().rstrip("`")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI returned malformed JSON: {e}")

    drafts = [
        PlatformDraft(
            platform=d["platform"],
            platform_name=PLATFORM_RULES.get(d["platform"], {}).get("name", d["platform"]),
            body=d.get("body", ""),
            hashtags=d.get("hashtags", []),
            char_limit=PLATFORM_RULES.get(d["platform"], {}).get("char_limit", 2200),
        )
        for d in data.get("drafts", [])
        if d.get("platform") in PLATFORM_RULES
    ]

    # Log usage for credits tracking
    await db.execute(text("INSERT INTO remix_usage (id) VALUES (uuid_generate_v4())"))
    await db.commit()

    return RemixBundle(source_summary=data.get("source_summary", ""), drafts=drafts)


@router.get("/usage")
async def get_usage(db: AsyncSession = Depends(get_db)):
    """Return remix count for the current calendar month."""
    result = await db.execute(text("""
        SELECT COUNT(*) AS count FROM remix_usage
        WHERE date_trunc('month', created_at) = date_trunc('month', NOW())
    """))
    return {"month_count": result.scalar()}
