"""
TikTok Content Posting API publisher.
Uses the file-upload (inbox) flow: init → upload chunk → publish.
Credentials are read exclusively from Settings (loaded from .env).
"""

from dataclasses import dataclass
from pathlib import Path
import httpx
from config import get_settings

TIKTOK_BASE = "https://open.tiktokapis.com/v2"


@dataclass
class PublishResult:
    publish_id: str


def _auth_headers() -> dict[str, str]:
    token = get_settings().tiktok_access_token
    if not token:
        raise RuntimeError("TIKTOK_ACCESS_TOKEN is not set in .env")
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=UTF-8",
    }


async def publish_video(
    video_path: str,
    caption: str,
    *,
    privacy_level: str = "PUBLIC_TO_EVERYONE",
    disable_duet: bool = False,
    disable_comment: bool = False,
    disable_stitch: bool = False,
) -> PublishResult:
    cfg = get_settings()
    if not cfg.tiktok_client_key:
        raise RuntimeError("TIKTOK_CLIENT_KEY is not set in .env")

    video_bytes = Path(video_path).read_bytes()
    total_bytes = len(video_bytes)

    async with httpx.AsyncClient(timeout=120) as client:
        # Step 1: initialise upload
        init_resp = await client.post(
            f"{TIKTOK_BASE}/post/publish/inbox/video/init/",
            headers=_auth_headers(),
            json={
                "post_info": {
                    "title": caption[:150],
                    "privacy_level": privacy_level,
                    "disable_duet": disable_duet,
                    "disable_comment": disable_comment,
                    "disable_stitch": disable_stitch,
                },
                "source_info": {
                    "source": "FILE_UPLOAD",
                    "video_size": total_bytes,
                    "chunk_size": total_bytes,
                    "total_chunk_count": 1,
                },
            },
        )
        init_resp.raise_for_status()
        data = init_resp.json()["data"]
        publish_id = data["publish_id"]
        upload_url = data["upload_url"]

        # Step 2: upload the single chunk
        upload_resp = await client.put(
            upload_url,
            content=video_bytes,
            headers={
                "Content-Type": "video/mp4",
                "Content-Range": f"bytes 0-{total_bytes - 1}/{total_bytes}",
                "Content-Length": str(total_bytes),
            },
        )
        upload_resp.raise_for_status()

    return PublishResult(publish_id=publish_id)
