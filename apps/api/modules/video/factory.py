"""
Video Content Factory — Phase 2

Orchestrates the full A/B export pipeline:
  1. Probe source asset (ffprobe)
  2. Discover system font for drawtext
  3. Build caption segments + drawtext filters per style
  4. Assemble complete FFmpeg filter chains
  5. Export both variants in parallel (asyncio.gather)
  6. Re-probe outputs for actual durations

Audio is stripped from outputs intentionally; platform music/VO is
added at publish time via the respective publisher modules.
"""

import asyncio
from dataclasses import dataclass
from pathlib import Path

from config import get_settings
from .probe import probe, VideoMeta
from .captions import build_timed_segments, build_drawtext_filters
from .filters import variant_a_filter_chain, variant_b_filter_chain


# Ordered list of fonts to try; first hit wins.
_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
]

# Max output durations (platform limits)
_MAX_DUR_A = 30.0   # fast cut — keep punchy
_MAX_DUR_B = 45.0   # cinematic — more breathing room


@dataclass
class VariantResult:
    variant_a_path: str
    variant_b_path: str
    variant_a_duration_sec: float
    variant_b_duration_sec: float


def _find_font() -> str:
    for path in _FONT_CANDIDATES:
        if Path(path).exists():
            return path
    raise RuntimeError(
        "No drawtext font found. "
        "Add 'fonts-dejavu-core' or 'fonts-liberation' to the API Dockerfile."
    )


async def _run_ffmpeg(cmd: list[str]) -> tuple[int, str]:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    return proc.returncode, stderr.decode()


async def _export_variant(
    asset_path: str,
    out_path: str,
    vf: str,
    target_duration: float,
    crf: int,
    preset: str,
    threads: int,
) -> float:
    """
    Run a single FFmpeg export and return the actual duration of the output file.
    Raises RuntimeError on non-zero FFmpeg exit.
    """
    cmd = [
        "ffmpeg", "-y",
        "-i", asset_path,
        "-vf", vf,
        "-t", str(target_duration),
        "-c:v", "libx264",
        "-crf", str(crf),
        "-preset", preset,
        "-profile:v", "high",
        "-level", "4.0",
        "-pix_fmt", "yuv420p",      # broad device compatibility
        "-movflags", "+faststart",  # streaming-friendly
        "-threads", str(threads),
        "-an",                      # no audio — added at publish time
        out_path,
    ]
    code, err = await _run_ffmpeg(cmd)
    if code != 0:
        raise RuntimeError(f"FFmpeg export failed for {Path(out_path).name}:\n{err[-2000:]}")

    meta = await probe(out_path)
    return meta.duration


async def generate_ab_variants(
    asset_path: str,
    caption: str,
    post_id: str,
) -> VariantResult:
    """
    Generate Variant A (fast/aggressive) and Variant B (cinematic/minimal)
    from a single source asset, running both FFmpeg passes in parallel.

    Args:
        asset_path: Absolute path to the source video file.
        caption:    Draft caption text; used to build timed overlay segments.
        post_id:    UUID string used to name the output files.

    Returns:
        VariantResult with output paths and measured durations.
    """
    cfg = get_settings()
    out_dir = Path(cfg.storage_base_path) / "outputs"
    (out_dir / "variant_a").mkdir(parents=True, exist_ok=True)
    (out_dir / "variant_b").mkdir(parents=True, exist_ok=True)

    path_a = str(out_dir / "variant_a" / f"{post_id}.mp4")
    path_b = str(out_dir / "variant_b" / f"{post_id}.mp4")

    # Step 1: probe source
    meta: VideoMeta = await probe(asset_path)

    # Step 2: resolve font
    font = _find_font()

    # Step 3: target durations
    # Variant A is sped up 20% (setpts=0.80*PTS) so we feed MORE source footage
    # to reach the same wall-clock output length.
    dur_a = min(meta.duration, _MAX_DUR_A)
    dur_b = min(meta.duration, _MAX_DUR_B)

    # Step 4: build caption overlays
    segs_a = build_timed_segments(caption, dur_a, "fast_aggressive")
    segs_b = build_timed_segments(caption, dur_b, "cinematic_minimal")
    dt_a = build_drawtext_filters(segs_a, "fast_aggressive", font)
    dt_b = build_drawtext_filters(segs_b, "cinematic_minimal", font)

    # Step 5: assemble filter chains
    vf_a = variant_a_filter_chain(dt_a)
    vf_b = variant_b_filter_chain(dt_b)

    # Step 6: export both in parallel
    actual_dur_a, actual_dur_b = await asyncio.gather(
        _export_variant(
            asset_path, path_a, vf_a, dur_a,
            crf=23, preset="fast", threads=cfg.ffmpeg_threads,
        ),
        _export_variant(
            asset_path, path_b, vf_b, dur_b,
            crf=21, preset="slow", threads=cfg.ffmpeg_threads,
        ),
    )

    return VariantResult(
        variant_a_path=path_a,
        variant_b_path=path_b,
        variant_a_duration_sec=round(actual_dur_a, 2),
        variant_b_duration_sec=round(actual_dur_b, 2),
    )
