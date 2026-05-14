"""
Instagram Graph API publisher.
Implements the two-step container → publish flow for Reels.
Credentials are read exclusively from Settings (loaded from .env).
"""

from dataclasses import dataclass
import httpx
from config import get_settings

GRAPH_BASE = "https://graph.facebook.com/v20.0"


@dataclass
class PublishResult:
    platform_post_id: str
    permalink: str | None


def _headers() -> dict[str, str]:
    token = get_settings().instagram_access_token
    if not token:
        raise RuntimeError("INSTAGRAM_ACCESS_TOKEN is not set in .env")
    return {"Authorization": f"Bearer {token}"}


async def publish_reel(video_url: str, caption: str) -> PublishResult:
    cfg = get_settings()
    if not cfg.instagram_account_id:
        raise RuntimeError("INSTAGRAM_ACCOUNT_ID is not set in .env")

    account_id = cfg.instagram_account_id

    async with httpx.AsyncClient(timeout=60) as client:
        # Step 1: create media container
        container_resp = await client.post(
            f"{GRAPH_BASE}/{account_id}/media",
            headers=_headers(),
            json={
                "media_type": "REELS",
                "video_url": video_url,
                "caption": caption,
            },
        )
        container_resp.raise_for_status()
        container_id = container_resp.json()["id"]

        # Step 2: publish the container
        publish_resp = await client.post(
            f"{GRAPH_BASE}/{account_id}/media_publish",
            headers=_headers(),
            json={"creation_id": container_id},
        )
        publish_resp.raise_for_status()
        post_id = publish_resp.json()["id"]

        # Step 3: fetch permalink
        meta_resp = await client.get(
            f"{GRAPH_BASE}/{post_id}",
            headers=_headers(),
            params={"fields": "permalink"},
        )
        permalink = meta_resp.json().get("permalink") if meta_resp.is_success else None

    return PublishResult(platform_post_id=post_id, permalink=permalink)
