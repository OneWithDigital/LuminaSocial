"""
Trend Ingestion Worker
Polls SerpApi on a configurable interval and inserts new trends into the DB.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone

import asyncpg
import httpx
from config import get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [trend_worker] %(message)s")
log = logging.getLogger(__name__)


async def fetch_trends() -> list[dict]:
    cfg = get_settings()
    if not cfg.serpapi_api_key:
        log.warning("SERPAPI_API_KEY not set — skipping fetch")
        return []

    params = {
        "engine": "google_trends_trending_now",
        "geo": cfg.trend_region,
        "api_key": cfg.serpapi_api_key,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get("https://serpapi.com/search.json", params=params)
        resp.raise_for_status()
        data = resp.json()

    trends = []
    for item in data.get("trending_searches", []):
        trends.append({
            "keyword": item.get("query", ""),
            "source": "serpapi",
            "source_url": item.get("link", ""),
            "region": cfg.trend_region,
            "search_volume": item.get("search_volume"),
            "related_topics": json.dumps(item.get("related_queries", [])),
            "raw_payload": json.dumps(item),
        })
    return trends


async def persist_trends(conn, trends: list[dict]) -> int:
    inserted = 0
    for t in trends:
        row = await conn.fetchrow(
            """
            INSERT INTO trends
                (keyword, source, source_url, region, search_volume,
                 related_topics, raw_payload, fetched_at)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
            ON CONFLICT DO NOTHING
            RETURNING id
            """,
            t["keyword"], t["source"], t["source_url"], t["region"],
            t["search_volume"], t["related_topics"], t["raw_payload"],
            datetime.now(timezone.utc),
        )
        if row:
            inserted += 1
    return inserted


async def run():
    cfg = get_settings()
    conn = await asyncpg.connect(cfg.database_url)
    log.info("Connected to database. Starting trend ingestion loop.")
    try:
        while True:
            try:
                trends = await fetch_trends()
                n = await persist_trends(conn, trends)
                log.info("Fetched %d trends, inserted %d new.", len(trends), n)
            except Exception as exc:
                log.error("Fetch error: %s", exc)
            await asyncio.sleep(cfg.trend_fetch_interval_minutes * 60)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
