# LuminaSocial Brand Guidelines

> This file is loaded by the AI Brand Guardrail module before every post advances to "Pending."
> The LLM scores each draft caption and visual style description against these rules (0–100).
> Posts scoring below 70 are held as Draft with an explanation; below 40 are auto-rejected.

---

## 1. Brand Voice

| Attribute      | Do                                         | Don't                                          |
|----------------|--------------------------------------------|------------------------------------------------|
| Tone           | Confident, energetic, aspirational         | Aggressive, clickbait, fear-based              |
| Language       | Clear, punchy sentences (≤ 15 words each)  | Jargon, excessive acronyms, passive voice      |
| Personality    | Witty and human — like a knowledgeable friend | Corporate stiffness or condescending phrasing |
| Emoji usage    | 1–3 emojis maximum per caption             | Emoji spam or irrelevant symbols               |

---

## 2. Visual Style

### Variant A — Fast / Aggressive
- **Pacing:** Cut every 1.5–2 seconds on beat.
- **Text overlays:** Bold sans-serif (e.g., Impact / Montserrat Black), white with dark stroke.
- **Color grading:** High contrast, punchy saturation (+20–30%).
- **Hook:** First 3 seconds must display a stat, question, or bold statement.

### Variant B — Cinematic / Minimal
- **Pacing:** Cuts every 4–6 seconds; allow breathing room.
- **Text overlays:** Thin serif or light sans-serif, centered, tasteful fade-in.
- **Color grading:** Slightly desaturated, warm or cool film look (no over-saturation).
- **Hook:** First 5 seconds must establish mood through visuals before text appears.

---

## 3. Prohibited Content

- No claims about income, health outcomes, or legal advice unless explicitly sourced.
- No competitor mentions, even neutrally.
- No hate speech, explicit content, or political opinion.
- No fake urgency ("Last chance!", "Only today!") without a real deadline.
- No misleading statistics — every number cited must have a source URL in the post metadata.

---

## 4. Caption Structure

```
[Hook line — 1 sentence, max 12 words]

[Body — 2–3 sentences expanding the hook]

[CTA — clear single action: "Comment X", "Save this", "Link in bio"]

[Hashtags — 5–10, mix of niche + broad, placed at end]
```

---

## 5. Platform-Specific Rules

| Platform        | Max Caption Length | Hashtag Count | Aspect Ratio | Max Duration |
|-----------------|--------------------|---------------|--------------|--------------|
| Instagram Reels | 2,200 chars        | 10            | 9:16         | 90s          |
| TikTok          | 2,200 chars        | 5             | 9:16         | 60s          |
| YouTube Shorts  | 100 chars (title)  | 3             | 9:16         | 60s          |
| Twitter/X       | 280 chars          | 2             | 16:9 or 9:16 | 140s         |
| LinkedIn        | 3,000 chars        | 5             | 16:9         | 10 min       |

---

## 6. Scoring Rubric for Guardrail LLM

When scoring, evaluate:

1. **Tone alignment** (25 pts) — Does the caption match the brand voice table above?
2. **Prohibited content check** (25 pts) — Zero prohibited elements = full score.
3. **Structure compliance** (20 pts) — Hook / body / CTA / hashtags all present.
4. **Platform fit** (15 pts) — Length, hashtag count, and format match the target platform.
5. **Visual style consistency** (15 pts) — Does the described visual treatment match the variant style guide?

Total: 100 pts. Threshold for "Pending": ≥ 70. Auto-reject: < 40.
