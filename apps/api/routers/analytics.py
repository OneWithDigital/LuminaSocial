from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from db.connection import get_db

router = APIRouter()


class AnalyticsUpsert(BaseModel):
    post_id: str
    variant: str  # 'A' or 'B'
    platform: str
    likes: int = 0
    shares: int = 0
    comments: int = 0
    views: int = 0
    watch_time_sec: float = 0
    click_through_rate: float = 0
    saves: int = 0
    raw_payload: Optional[dict] = None


@router.get("/lessons/latest")
async def get_latest_lessons(limit: int = 10, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM lessons_learned ORDER BY created_at DESC LIMIT :limit"),
        {"limit": limit},
    )
    return [dict(row._mapping) for row in result.fetchall()]


@router.get("/{post_id}")
async def get_analytics(post_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM analytics WHERE post_id = :post_id ORDER BY snapshot_at DESC"),
        {"post_id": post_id},
    )
    rows = result.fetchall()
    if not rows:
        return []
    return [dict(row._mapping) for row in rows]


@router.post("/", status_code=201)
async def record_analytics(body: AnalyticsUpsert, db: AsyncSession = Depends(get_db)):
    from config import get_settings
    settings = get_settings()

    tier = "Low"
    if body.views >= settings.viral_threshold_views:
        tier = "Viral"
    elif body.views >= settings.mid_threshold_views:
        tier = "Mid"

    import json
    result = await db.execute(
        text("""
            INSERT INTO analytics
                (post_id, variant, platform, likes, shares, comments, views,
                 watch_time_sec, click_through_rate, saves, performance_tier, raw_payload)
            VALUES
                (:post_id::uuid, :variant, :platform::platform_target,
                 :likes, :shares, :comments, :views,
                 :watch_time_sec, :click_through_rate, :saves,
                 :tier::performance_tier, :raw_payload::jsonb)
            RETURNING *
        """),
        {**body.model_dump(), "tier": tier,
         "raw_payload": json.dumps(body.raw_payload or {})},
    )
    await db.commit()
    return dict(result.fetchone()._mapping)
