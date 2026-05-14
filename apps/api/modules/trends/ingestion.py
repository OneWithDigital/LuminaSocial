"""
Trend Ingestion Engine
Fetches trending topics from SerpApi Google Trends endpoint and
persists them to the `trends` table.

Phase 2 will add: deduplication, shelf-life expiry, and multi-source fan-out.
"""

import httpx
from datetime import datetime, timezone
from config import get_settings


SERPAPI_TRENDS_URL = "https://serpapi.com/search.json"


async def fetch_trending_topics(region: str = "US") -> list[dict]:
    settings = get_settings()
    params = {
        "engine": "google_trends_trending_now",
        "geo": region,
        "api_key": settings.serpapi_api_key,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = client.get(SERPAPI_TRENDS_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    trends = []
    for item in data.get("trending_searches", []):
        trends.append({
            "keyword": item.get("query", ""),
            "source": "serpapi",
            "source_url": item.get("link", ""),
            "region": region,
            "search_volume": item.get("search_volume"),
            "related_topics": item.get("related_queries", []),
            "raw_payload": item,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        })
    return trends
