"""
FFprobe wrapper — reads stream metadata from a video asset before processing.
"""

import asyncio
import json
from dataclasses import dataclass


@dataclass
class VideoMeta:
    duration: float     # seconds
    width: int
    height: int
    fps: float
    has_audio: bool


async def probe(asset_path: str) -> VideoMeta:
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        asset_path,
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe failed on '{asset_path}' — file may be missing or corrupt")

    streams = json.loads(stdout).get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    if not video:
        raise RuntimeError(f"No video stream found in '{asset_path}'")

    has_audio = any(s.get("codec_type") == "audio" for s in streams)

    # duration may live on the stream or fall back to format-level
    duration = float(video.get("duration") or 0)

    fps_str = video.get("r_frame_rate", "30/1")
    try:
        num, den = fps_str.split("/")
        fps = float(num) / float(den)
    except (ValueError, ZeroDivisionError):
        fps = 30.0

    return VideoMeta(
        duration=duration,
        width=int(video.get("width", 1080)),
        height=int(video.get("height", 1920)),
        fps=round(fps, 3),
        has_audio=has_audio,
    )
