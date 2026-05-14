from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from db.connection import get_db
from modules.trends.ingestion import fetch_trending_topics

router = APIRouter()


@router.get("/")
async def list_trends(limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM trends ORDER BY fetched_at DESC LIMIT :limit"),
        {"limit": limit},
    )
    return [dict(row._mapping) for row in result.fetchall()]


@router.post("/fetch", status_code=201)
async def trigger_trend_fetch(region: str = "US", db: AsyncSession = Depends(get_db)):
    topics = await fetch_trending_topics(region)
    inserted = []
    for t in topics:
        result = await db.execute(
            text("""
                INSERT INTO trends
                    (keyword, source, source_url, region, search_volume,
                     related_topics, raw_payload, fetched_at)
                VALUES
                    (:keyword, :source, :source_url, :region, :search_volume,
                     :related_topics::jsonb, :raw_payload::jsonb, :fetched_at::timestamptz)
                ON CONFLICT DO NOTHING
                RETURNING id, keyword
            """),
            t,
        )
        row = result.fetchone()
        if row:
            inserted.append(dict(row._mapping))
    await db.commit()
    return {"inserted": len(inserted), "trends": inserted}
