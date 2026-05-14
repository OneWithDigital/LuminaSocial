"""
Caption segmenter and FFmpeg drawtext filter builder.

Flow:
  raw caption text
    → split into short display lines
    → assign timed windows across video duration
    → emit one drawtext= filter string per segment
"""

import re
from dataclasses import dataclass


@dataclass
class CaptionSegment:
    text: str
    start: float   # seconds
    end: float     # seconds


# Characters that must be escaped inside FFmpeg filter expressions.
# We are using subprocess exec (not shell), so only FFmpeg-level escaping applies.
_DRAWTEXT_ESCAPE = str.maketrans({
    "\\": "\\\\",
    "'":  "\\'",
    ":":  "\\:",
    "%":  "%%",
})


def _escape(text: str) -> str:
    return text.translate(_DRAWTEXT_ESCAPE)


def _split_into_lines(caption: str, max_words: int) -> list[str]:
    """
    Strip hashtags, split on sentence boundaries, then chunk each sentence
    into lines of at most max_words words.
    """
    # Drop hashtag block (everything after the first #)
    caption = re.split(r"\s#\w", caption)[0].strip()

    lines: list[str] = []
    for sentence in re.split(r"(?<=[.!?])\s+", caption):
        sentence = sentence.strip(" .,!?")
        if not sentence:
            continue
        words = sentence.split()
        for i in range(0, len(words), max_words):
            chunk = " ".join(words[i : i + max_words])
            if chunk:
                lines.append(chunk)

    return lines[:8]  # hard cap to prevent cramming the screen


def build_timed_segments(
    caption: str,
    video_duration: float,
    style: str,
) -> list[CaptionSegment]:
    """
    Distribute caption lines evenly across the video, leaving a clean
    hook window at the start and a logo/outro window at the end.
    """
    max_words = 6 if style == "fast_aggressive" else 10
    lines = _split_into_lines(caption, max_words)
    if not lines:
        return []

    # How long to leave the opening visual before text appears
    hook_sec = 2.0 if style == "fast_aggressive" else 4.0
    outro_sec = 2.5
    text_window = max(video_duration - hook_sec - outro_sec, 3.0)
    slot = text_window / len(lines)

    segments: list[CaptionSegment] = []
    for i, line in enumerate(lines):
        start = hook_sec + i * slot
        end = start + slot - 0.25   # small gap between segments
        segments.append(CaptionSegment(text=line, start=round(start, 2), end=round(end, 2)))
    return segments


def build_drawtext_filters(
    segments: list[CaptionSegment],
    style: str,
    font_path: str,
) -> list[str]:
    """
    Return one FFmpeg drawtext= filter string per caption segment.
    These are joined with commas into a larger -vf chain in filters.py.
    """
    filters: list[str] = []

    for seg in segments:
        text = _escape(seg.text)
        enable = f"between(t\\,{seg.start}\\,{seg.end})"

        if style == "fast_aggressive":
            # Bold, high-contrast lower-third with solid box background
            f = (
                f"drawtext="
                f"fontfile='{font_path}'"
                f":text='{text}'"
                f":fontsize=52"
                f":fontcolor=white"
                f":x=(w-text_w)/2"
                f":y=h*0.82-text_h/2"
                f":box=1"
                f":boxcolor=black@0.60"
                f":boxborderw=10"
                f":shadowx=2:shadowy=2:shadowcolor=black"
                f":enable='{enable}'"
            )
        else:
            # Cinematic: lighter text, soft shadow, fade-in per segment
            fade = f"if(lt(t-{seg.start}\\,0.45)\\,(t-{seg.start})/0.45\\,1)"
            f = (
                f"drawtext="
                f"fontfile='{font_path}'"
                f":text='{text}'"
                f":fontsize=38"
                f":fontcolor=white"
                f":alpha='{fade}'"
                f":x=(w-text_w)/2"
                f":y=h*0.78-text_h/2"
                f":shadowx=1:shadowy=1:shadowcolor=black@0.65"
                f":enable='{enable}'"
            )
        filters.append(f)

    return filters
