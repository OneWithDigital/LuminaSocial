import json
import re
from typing import Optional

import anthropic
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.connection import get_db
from config import get_settings

router = APIRouter()


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    website_url: Optional[str] = None
    bio: Optional[str] = None
    brand_voice: Optional[str] = None
    brand_colors: Optional[list[str]] = None
    brand_keywords: Optional[list[str]] = None
    connected_accounts: Optional[dict] = None


class ScrapeRequest(BaseModel):
    url: str


class AIDraftRequest(BaseModel):
    ideas: str
    platform: str = "instagram"
    brand_voice: Optional[str] = None


class AIDraftResponse(BaseModel):
    title: str
    hook: str
    body: str
    caption: str


@router.get("/")
async def get_profile(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT * FROM user_profiles ORDER BY id LIMIT 1"))
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")
    return dict(row)


@router.put("/")
async def update_profile(payload: ProfileUpdate, db: AsyncSession = Depends(get_db)):
    fields = payload.model_dump(exclude_none=True)
    if not fields:
        result = await db.execute(text("SELECT * FROM user_profiles ORDER BY id LIMIT 1"))
        row = result.mappings().first()
        return dict(row)

    set_clauses = []
    params: dict = {}
    for key, val in fields.items():
        set_clauses.append(f"{key} = :{key}")
        params[key] = val

    query = text(f"""
        UPDATE user_profiles
        SET {', '.join(set_clauses)}
        WHERE id = (SELECT id FROM user_profiles ORDER BY id LIMIT 1)
        RETURNING *
    """)
    result = await db.execute(query, params)
    await db.commit()
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")
    return dict(row)


@router.post("/scrape")
async def scrape_website(req: ScrapeRequest):
    url = req.url if req.url.startswith("http") else f"https://{req.url}"
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 LuminaSocial/1.0"})
            resp.raise_for_status()
            html = resp.text
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not fetch website: {e}")

    page_text = re.sub(r"<style[^>]*>.*?</style>", " ", html, flags=re.DOTALL)
    page_text = re.sub(r"<script[^>]*>.*?</script>", " ", page_text, flags=re.DOTALL)
    page_text = re.sub(r"<[^>]+>", " ", page_text)
    page_text = re.sub(r"\s+", " ", page_text).strip()[:4000]

    cfg = get_settings()
    if not cfg.anthropic_api_key:
        return {"brand_voice": "Professional and engaging", "brand_keywords": [], "bio": page_text[:200]}

    ai = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
    msg = ai.messages.create(
        model=cfg.anthropic_model,
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": (
                f"Extract brand information from this website text.\n\nText: {page_text}\n\n"
                "Return JSON with these exact keys:\n"
                "- brand_voice: one sentence describing tone/style\n"
                "- brand_keywords: array of 5-10 keywords\n"
                "- bio: 1-2 sentence company description\n"
                "Return ONLY the JSON object, no markdown."
            ),
        }],
    )
    try:
        return json.loads(msg.content[0].text)
    except Exception:
        return {"brand_voice": "", "brand_keywords": [], "bio": msg.content[0].text[:300]}


@router.post("/ai-draft", response_model=AIDraftResponse)
async def ai_draft(req: AIDraftRequest):
    cfg = get_settings()
    if not cfg.anthropic_api_key:
        return AIDraftResponse(
            title=f"Post about: {req.ideas[:60]}",
            hook="Here's something you need to know…",
            body=req.ideas,
            caption=f"{req.ideas}\n\n#socialmedia #content",
        )

    platform_hints = {
        "instagram": "Instagram Reels (short, visual, aspirational)",
        "tiktok": "TikTok (fast, trending, conversational)",
        "youtube_shorts": "YouTube Shorts (educational, clear value)",
        "twitter": "Twitter/X (punchy, opinionated, <280 chars body)",
        "linkedin": "LinkedIn (professional, insight-driven)",
    }
    platform_label = platform_hints.get(req.platform, req.platform)
    voice_hint = f"Brand voice: {req.brand_voice}." if req.brand_voice else ""

    ai = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
    msg = ai.messages.create(
        model=cfg.anthropic_model,
        max_tokens=600,
        messages=[{
            "role": "user",
            "content": (
                f"Create social media post content for {platform_label}.\n{voice_hint}\n"
                f"Ideas / topic: {req.ideas}\n\n"
                "Return JSON with exactly these keys:\n"
                "- title: short internal title (max 10 words)\n"
                "- hook: opening line that grabs attention (1 sentence, under 15 words)\n"
                "- body: main message (2-4 sentences)\n"
                "- caption: full ready-to-post caption with hook, body, CTA and hashtags\n"
                "Return ONLY the JSON object, no markdown."
            ),
        }],
    )
    try:
        return AIDraftResponse(**json.loads(msg.content[0].text))
    except Exception:
        raw = msg.content[0].text
        return AIDraftResponse(title=req.ideas[:60], hook=raw[:120], body=raw, caption=raw)
