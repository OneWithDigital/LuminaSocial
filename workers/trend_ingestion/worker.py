"""
Trend Ingestion Worker
Polls SerpApi on a configurable interval and inserts new trends into the DB.
"""

import asyncio
import json
import os
import logging
from datetime import datetime, timezone

import asyncpg
import httpx
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [trend_worker] %(message)s")
log = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "")
SERPAPI_KEY = os.getenv("SERPAPI_API_KEY", "")
REGION = os.getenv("TREND_REGION", "US")
INTERVAL_MINUTES = int(os.getenv("TREND_FETCH_INTERVAL_MINUTES", "60"))


async def fetch_trends() -> list[dict]:
    if not SERPAPI_KEY:
        log.warning("SERPAPI_API_KEY not set — skipping fetch")
        return []

    params = {
        "engine": "google_trends_trending_now",
        "geo": REGION,
        "api_key": SERPAPI_KEY,
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
            "region": REGION,
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
    conn = await asyncpg.connect(DATABASE_URL)
    log.info("Connected to database. Starting trend ingestion loop.")
    try:
        while True:
            try:
                trends = await fetch_trends()
                n = await persist_trends(conn, trends)
                log.info("Fetched %d trends, inserted %d new.", len(trends), n)
            except Exception as exc:
                log.error("Fetch error: %s", exc)
            await asyncio.sleep(INTERVAL_MINUTES * 60)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
