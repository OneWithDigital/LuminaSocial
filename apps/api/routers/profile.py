from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import Optional
import httpx
import re
import anthropic

from db import get_db
from config import get_settings

router = APIRouter()


class ConnectedAccount(BaseModel):
    connected: bool = False
    handle: Optional[str] = None
    token: Optional[str] = None


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
async def get_profile():
    async with get_db() as db:
        row = await db.fetchrow("SELECT * FROM user_profiles ORDER BY id LIMIT 1")
        if not row:
            raise HTTPException(status_code=404, detail="Profile not found")
        return dict(row)


@router.put("/")
async def update_profile(payload: ProfileUpdate):
    fields = payload.model_dump(exclude_none=True)
    if not fields:
        async with get_db() as db:
            row = await db.fetchrow("SELECT * FROM user_profiles ORDER BY id LIMIT 1")
            return dict(row)

    set_clauses = []
    values = []
    for i, (key, val) in enumerate(fields.items(), start=1):
        set_clauses.append(f"{key} = ${i}")
        values.append(val)

    values.append(None)  # placeholder for RETURNING id
    query = f"""
        UPDATE user_profiles
        SET {', '.join(set_clauses)}
        WHERE id = (SELECT id FROM user_profiles ORDER BY id LIMIT 1)
        RETURNING *
    """
    # Remove the placeholder — use positional args only
    values.pop()
    async with get_db() as db:
        row = await db.fetchrow(query, *values)
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

    # Strip tags and collapse whitespace
    text = re.sub(r"<style[^>]*>.*?</style>", " ", html, flags=re.DOTALL)
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()[:4000]

    cfg = get_settings()
    if not cfg.anthropic_api_key:
        return {
            "brand_voice": "Professional and engaging",
            "brand_keywords": [],
            "bio": text[:200],
        }

    client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
    msg = client.messages.create(
        model=cfg.anthropic_model,
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": (
                f"Extract brand information from this website text.\n\n"
                f"Text: {text}\n\n"
                f"Return JSON with these exact keys:\n"
                f"- brand_voice: one sentence describing tone/style\n"
                f"- brand_keywords: array of 5-10 keywords\n"
                f"- bio: 1-2 sentence company description\n"
                f"Return ONLY the JSON object, no markdown."
            ),
        }],
    )

    import json
    try:
        result = json.loads(msg.content[0].text)
    except Exception:
        result = {"brand_voice": "", "brand_keywords": [], "bio": msg.content[0].text[:300]}

    return result


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

    voice_hint = f"Brand voice: {req.brand_voice}." if req.brand_voice else ""
    platform_hints = {
        "instagram": "Instagram Reels (short, visual, aspirational)",
        "tiktok": "TikTok (fast, trending, conversational)",
        "youtube_shorts": "YouTube Shorts (educational, clear value)",
        "twitter": "Twitter/X (punchy, opinionated, <280 chars body)",
        "linkedin": "LinkedIn (professional, insight-driven)",
    }
    platform_label = platform_hints.get(req.platform, req.platform)

    client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
    msg = client.messages.create(
        model=cfg.anthropic_model,
        max_tokens=600,
        messages=[{
            "role": "user",
            "content": (
                f"Create social media post content for {platform_label}.\n"
                f"{voice_hint}\n"
                f"Ideas / topic: {req.ideas}\n\n"
                f"Return JSON with exactly these keys:\n"
                f"- title: short internal title for this post (max 10 words)\n"
                f"- hook: the opening line that grabs attention instantly (1 sentence, under 15 words)\n"
                f"- body: the main message body (2-4 sentences)\n"
                f"- caption: full ready-to-post caption with hook, body, CTA and hashtags\n"
                f"Return ONLY the JSON object, no markdown."
            ),
        }],
    )

    import json
    try:
        data = json.loads(msg.content[0].text)
        return AIDraftResponse(**data)
    except Exception:
        raw = msg.content[0].text
        return AIDraftResponse(
            title=req.ideas[:60],
            hook=raw[:120],
            body=raw,
            caption=raw,
        )
