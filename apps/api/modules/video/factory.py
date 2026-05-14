"""
Video Content Factory
Orchestrates FFmpeg to produce two A/B variant videos from raw assets.

Phase 2 will flesh out: dynamic caption overlays, beat-sync cutting,
color grading filters, and asset sourcing.
"""

import asyncio
import uuid
from pathlib import Path
from config import get_settings


async def _run_ffmpeg(cmd: list[str]) -> tuple[int, str]:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    return proc.returncode, stderr.decode()


async def generate_ab_variants(
    asset_path: str,
    caption: str,
    post_id: str,
) -> dict[str, str]:
    """
    Produce variant_a (fast/aggressive) and variant_b (cinematic/minimal).
    Returns a dict with keys 'variant_a_path' and 'variant_b_path'.
    """
    settings = get_settings()
    out_dir = Path(settings.storage_base_path) / "outputs"
    out_dir.mkdir(parents=True, exist_ok=True)

    variant_a_path = str(out_dir / "variant_a" / f"{post_id}.mp4")
    variant_b_path = str(out_dir / "variant_b" / f"{post_id}.mp4")

    Path(out_dir / "variant_a").mkdir(parents=True, exist_ok=True)
    Path(out_dir / "variant_b").mkdir(parents=True, exist_ok=True)

    # Variant A: fast-paced with boosted contrast/saturation
    cmd_a = [
        "ffmpeg", "-y",
        "-i", asset_path,
        "-vf", "eq=contrast=1.3:saturation=1.4,setpts=0.75*PTS",
        "-t", "30",
        "-threads", str(settings.ffmpeg_threads),
        "-c:v", "libx264", "-crf", "23", "-preset", "fast",
        variant_a_path,
    ]

    # Variant B: cinematic with desaturation and slower pacing
    cmd_b = [
        "ffmpeg", "-y",
        "-i", asset_path,
        "-vf", "eq=contrast=1.05:saturation=0.75,setpts=1.25*PTS",
        "-t", "45",
        "-threads", str(settings.ffmpeg_threads),
        "-c:v", "libx264", "-crf", "21", "-preset", "slow",
        variant_b_path,
    ]

    code_a, err_a = await _run_ffmpeg(cmd_a)
    code_b, err_b = await _run_ffmpeg(cmd_b)

    if code_a != 0:
        raise RuntimeError(f"Variant A FFmpeg failed: {err_a}")
    if code_b != 0:
        raise RuntimeError(f"Variant B FFmpeg failed: {err_b}")

    return {"variant_a_path": variant_a_path, "variant_b_path": variant_b_path}
