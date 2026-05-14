"""
FFmpeg video filter chain builders, one per A/B variant style.

Each function takes the pre-built drawtext filter strings and returns a
complete -vf argument ready to pass to FFmpeg.

Output spec for both variants: 1080×1920 (9:16), H.264, no audio.
"""


def _scale_pad(bg_color: str) -> str:
    """Scale to fit inside 1080×1920, pad any letterbox/pillarbox gaps."""
    return (
        f"scale=1080:1920:force_original_aspect_ratio=decrease,"
        f"pad=1080:1920:(ow-iw)/2:(oh-ih)/2:{bg_color}"
    )


def variant_a_filter_chain(drawtext_filters: list[str]) -> str:
    """
    Fast / Aggressive style:
    - Pure black padding
    - Boosted contrast (+30%) and saturation (+40%)
    - Slight brightness lift
    - 20% speed-up via PTS manipulation
    - Bold caption overlays
    """
    base = [
        _scale_pad("black"),
        "eq=contrast=1.30:saturation=1.40:brightness=0.04",
        "setpts=0.80*PTS",
    ]
    return ",".join(base + drawtext_filters)


def variant_b_filter_chain(drawtext_filters: list[str]) -> str:
    """
    Cinematic / Minimal style:
    - Very dark grey padding (not pure black — softer look)
    - Gentle contrast lift, desaturated palette
    - Warm colour tint: red gamma up slightly, blue down
    - Soft vignette to draw focus to centre
    - Normal pacing (no PTS change)
    - Thin caption overlays with fade-in
    """
    base = [
        _scale_pad("color=#0d0d0d"),
        "eq=contrast=1.08:saturation=0.75:gamma_r=1.06:gamma_b=0.94",
        "vignette=PI/5",
    ]
    return ",".join(base + drawtext_filters)
