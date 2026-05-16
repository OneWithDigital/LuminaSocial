# LuminaSocial v2 — Product Requirements Document

**Status:** Draft for Review  
**Date:** May 2026  
**Prepared by:** Claude Code (based on ecosystem research)

---

## 1. Executive Summary

LuminaSocial v2 pivots from a _content approval portal_ (what v1 is today) into a **content production and distribution engine** — one workspace that takes any input (idea, URL, video, podcast) and outputs ready-to-publish posts for every platform simultaneously.

The north star is Blotato's core UX promise:
> _One input → AI-tailored drafts for all your platforms in one click → schedule or publish immediately._

The key differentiator from Blotato: LuminaSocial is **developer-native** — it ships a first-party API and MCP server from day one, making it the tool that agentic AI workflows (Claude, ChatGPT, n8n, Make) actually use to manage social media.

---

## 2. What Makes Blotato Work (and What to Copy)

Blotato has 10,000+ users at $29–$499/month. Here is what matters:

| Blotato Feature | Why It Works | LuminaSocial Equivalent |
|---|---|---|
| **Content Remixer** | One URL → 5 platform drafts in 30 sec. Zero manual reformatting. | **Phase 1** — Core Remixer |
| **Faceless Video** | No camera needed. ElevenLabs voice + AI B-roll. Huge for solopreneurs. | **Phase 3** — Video Engine |
| **Viral AI Coach** | Benchmarks against 1M+ posts. Specific feedback, not generic. | **Phase 2** — Analytics + Lessons |
| **Native n8n/Make nodes** | Automation users don't have to hand-build webhooks. | **Phase 3** — MCP Server |
| **Credits economy** | Makes AI usage visible. Creates natural upsell surface. | **Phase 2** — Credit system |
| **9-platform publisher** | Users reach everywhere from one dashboard. | **Phase 1** — via Ayrshare API |

**Blotato's weakness to exploit:** 2.0/5 on Trustpilot (billing complaints, poor support). Positioning opportunity: _Blotato's features, with developer trust._

---

## 3. Ecosystem Technology Decisions

### 3A. Publishing API (picks one unified layer — no per-platform OAuth for v2)

| Option | Free Tier | Cost at Scale | Python SDK | Rate Limit | Verdict |
|---|---|---|---|---|---|
| **Ayrshare** | 20 posts/mo | $49–149/mo | ✅ Official | Standard | **Best for Phase 1** — best SDK, easiest setup |
| **Zernio** | 2 accounts | $1–6/account | ✅ Official | 1,200 req/min | **Best for Phase 3+** — 40x faster, pay-per-account |
| **Upload-Post** | 10 posts/mo | $16/mo (5 profiles) | ✅ `pip install upload-post` | Standard | Budget MVP fallback |
| **PostEverywhere** | — | $19/mo | ✅ + MCP server | Standard | Has built-in AI gen too |

**Decision: Phase 1 → Ayrshare. Phase 3+ migrate to Zernio.**  
Ayrshare covers 13 platforms (Instagram, TikTok, LinkedIn, X, YouTube, Facebook, Pinterest, Reddit, Threads, Bluesky, Snapchat, Telegram, Google Business). One API key. Handles OAuth for each platform on behalf of the user. This eliminates the need to build any platform OAuth flows in v2.

### 3B. AI Content Generation Stack

```
Input (URL / idea / text / video transcript)
    ↓
Content Fetcher (httpx scrape / YouTube transcript / PDF extract)
    ↓
LangGraph Pipeline
    ├── Brand Voice Injector (RAG on stored brand guidelines)
    ├── Platform Adapter (platform rules: char limits, hashtag norms, tone)
    └── Claude claude-sonnet-4-6 (structured JSON output via Pydantic)
    ↓
PostBundle { instagram, tiktok, linkedin, twitter, youtube_shorts }
    ↓
Scheduler → Ayrshare API
```

**Libraries:**
- `langchain-core` + `langgraph` — pipeline orchestration
- `anthropic` — Claude generation (already in use)
- Pydantic `BaseModel` — enforced structured output per platform
- `chromadb` — local vector store for brand voice RAG
- `youtube-transcript-api` — pull transcripts from YouTube URLs
- `httpx` + `beautifulsoup4` — URL scraping (already in use for profile scraper)

### 3C. Analytics

| Tool | Use Case | Cost |
|---|---|---|
| **Ayrshare built-in** | Post-level likes/shares/comments/reach | Included in publishing plan |
| **Shortimize** | Short-form video performance (TikTok/Reels/Shorts) | Usage-based |
| **Zernio Analytics** | Unified cross-platform analytics at scale | Per-account |

Phase 1: use Ayrshare's analytics endpoints. Phase 2: add dedicated analytics polling job.

### 3D. Python Libraries (direct access when needed)

| Platform | Library | Status |
|---|---|---|
| X/Twitter | `tweepy` | ✅ Active, X API v2 |
| Instagram | Use Ayrshare (Graph API requires Business account + App Review) | — |
| LinkedIn | `linkedin-api-python-client` (official) | ✅ Active |
| Reddit | `praw` | ✅ Active |
| TikTok | Use Ayrshare (official TikTok API requires separate approval) | — |

### 3E. Open Source Reference Projects

| Project | Stars | Stack | What to Learn From It |
|---|---|---|---|
| **Postiz** (`gitroomhq/postiz-app`) | 30,400+ | Next.js + NestJS + Prisma + Temporal | Full feature reference; content calendar UI patterns; Temporal for scheduled jobs |
| **BrightBean Studio** (`brightbeanxyz`) | 1,700+ | Django + PostgreSQL + HTMX | **Closest to our stack**; approval workflows, media library, client portal, RBAC |
| **LangChain social-media-agent** | Official LangChain | LangGraph + Claude | URL → multi-platform post pipeline pattern |
| **TryPost** | 107 | PHP + Vue | Ships a built-in MCP server — study the architecture |

**License note:** Both Postiz and BrightBean are AGPL-3.0. You can study the code and use patterns/ideas, but you cannot copy files directly into a closed-source commercial product without AGPL compliance. Reference only.

---

## 4. Phased Roadmap

### Phase 1 — "Quick Win" Content Remixer (4–6 weeks)
**Goal:** Ship the Blotato core loop. One input → multi-platform post bundle → schedule.  
**Success metric:** A user can go from idea to 5 scheduled posts in under 2 minutes.

### Phase 2 — Analytics & Brand Intelligence (4 weeks)
**Goal:** Close the feedback loop. Show what's working and why.

### Phase 3 — Automation & Video (6 weeks)
**Goal:** Become developer-native and add the faceless video differentiator.

### Phase 4 — Agency & Scale (ongoing)
**Goal:** Multi-workspace, client portals, white-label API, credits economy.

---

## 5. Phase 1 — Detailed Spec: Content Remixer

### 5.1 Core Concept

Replace the current single-platform post wizard with a **Content Remixer** that:
1. Accepts any input type
2. Generates a **PostBundle** — one tailored draft per enabled platform
3. Lets the user review, edit, and schedule all platforms at once

### 5.2 Input Types (v2.1)

| Input | How It Works |
|---|---|
| **Raw idea / text** | User types or pastes text in a textarea |
| **URL** | System fetches, strips HTML, extracts key content (already have scraper) |
| **YouTube URL** | `youtube-transcript-api` pulls transcript; treat as text input |
| **Existing post** | Pick a published post from queue; remix into other formats |

_Deferred to Phase 2: PDF upload, video file transcription_

### 5.3 PostBundle Model

```python
class PlatformPost(BaseModel):
    platform: Platform
    body: str
    hashtags: list[str]
    character_count: int
    media_suggestion: str | None  # e.g. "add a bold text overlay" or "use a talking-head clip"

class PostBundle(BaseModel):
    source_summary: str           # 1-sentence summary of what was fed in
    instagram: PlatformPost
    tiktok: PlatformPost
    linkedin: PlatformPost
    twitter: PlatformPost
    youtube_shorts: PlatformPost  # caption/description
```

Each platform post respects its constraints:

| Platform | Max chars | Tone | Hashtag style |
|---|---|---|---|
| Twitter/X | 280 | Punchy, hook-first | 1–2 tags |
| Instagram | 2,200 | Engaging, story-driven | 5–10 niche tags |
| LinkedIn | 3,000 | Professional, insight-led | 3–5 professional tags |
| TikTok | 2,200 | Conversational, trend-aware | 3–5 trending tags |
| YouTube Shorts | 500 (description) | Searchable, keyword-rich | 3 tags |

### 5.4 New API Endpoint

```
POST /remix
{
  "input_type": "text" | "url" | "youtube_url" | "post_id",
  "content": "string",
  "platforms": ["instagram", "tiktok", "linkedin", "twitter"],  // optional subset
  "tone_override": "string | null"
}

Response: PostBundle (full JSON)
```

Backend pipeline:
1. Fetch/extract content based on `input_type`
2. Load brand voice from user profile (RAG inject if chromadb available, else direct string inject)
3. Call Claude with platform constraints as structured prompt
4. Return `PostBundle` with validated `PlatformPost` per platform

### 5.5 New Frontend: Remixer Page (`/remix`)

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ ✦ Content Remixer                                   │
│ ─────────────────────────────────────────────────── │
│  [Input area — idea / URL / paste]                  │
│                                                     │
│  Platforms: [IG] [TK] [LI] [X] [YT]  (toggles)    │
│                     [✨ Remix Content]               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  PLATFORM DRAFTS (generated, all editable)          │
│                                                     │
│  ┌───────────────┐  ┌───────────────┐              │
│  │ 📷 Instagram  │  │ 🎵 TikTok     │              │
│  │ [editable]    │  │ [editable]    │              │
│  └───────────────┘  └───────────────┘              │
│  ┌───────────────┐  ┌───────────────┐              │
│  │ 💼 LinkedIn   │  │ 𝕏 Twitter     │              │
│  │ [editable]    │  │ [editable]    │              │
│  └───────────────┘  └───────────────┘              │
│                                                     │
│  [Schedule All]  [Publish Now]  [Save as Drafts]    │
└─────────────────────────────────────────────────────┘
```

**Key interactions:**
- Generating shows a skeleton loading state per platform card (not a spinner — each card populates individually as streamed)
- Each platform card has: editable textarea, character counter, hashtag chips, platform color header
- "Schedule All" opens a single date/time picker — applies the same schedule to all selected platforms (user can override per-platform after)
- "Publish Now" calls Ayrshare for each enabled platform
- Platform cards can be individually toggled off before scheduling

### 5.6 Ayrshare Integration

```python
# apps/api/integrations/ayrshare.py

import httpx
from typing import Optional

AYRSHARE_BASE = "https://app.ayrshare.com/api"

async def publish_post(
    api_key: str,
    text: str,
    platforms: list[str],
    media_urls: list[str] | None = None,
    scheduled_date: str | None = None,  # ISO 8601
) -> dict:
    payload = {
        "post": text,
        "platforms": platforms,
    }
    if media_urls:
        payload["mediaUrls"] = media_urls
    if scheduled_date:
        payload["scheduleDate"] = scheduled_date

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{AYRSHARE_BASE}/post",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        resp.raise_for_status()
        return resp.json()
```

Environment variable to add to `.env`:
```
AYRSHARE_API_KEY=your_key_here
```

Users connect their social platforms through Ayrshare's hosted OAuth flow — no per-platform OAuth code needed in our app.

### 5.7 Updated Sidebar Navigation

Add `/remix` as the primary action item:

```
Dashboard
Remix ← NEW (primary CTA)
Trends
Analytics
Connections
---
Brand Settings
Help
```

### 5.8 Database Changes

New table for remixed post bundles:

```sql
CREATE TABLE post_bundles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,          -- 'text' | 'url' | 'youtube' | 'post_id'
  source_url  TEXT,
  summary     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Link individual posts to a bundle
ALTER TABLE posts ADD COLUMN bundle_id UUID REFERENCES post_bundles(id);
```

### 5.9 Phase 1 Deliverables Checklist

- [ ] `pip install ayrshare social-post-api` + env var config
- [ ] `POST /remix` endpoint with LangGraph pipeline
- [ ] `PostBundle` Pydantic model with per-platform constraints
- [ ] Brand voice RAG injection (chromadb — simple key/value version first)
- [ ] YouTube transcript extraction endpoint
- [ ] Frontend: `/remix` page with platform toggle cards
- [ ] Frontend: Inline editing + character counter per platform card
- [ ] Frontend: "Schedule All" modal with single datetime picker
- [ ] Frontend: "Publish Now" via Ayrshare
- [ ] Sidebar: Add "Remix" nav link
- [ ] DB: `post_bundles` table + `bundle_id` on posts
- [ ] Dashboard: Update "Post Architect" service box to link to `/remix`

---

## 6. Phase 2 — Analytics & Brand Intelligence

### New Features
- **Analytics sync job**: Poll Ayrshare analytics API every 6 hours for published posts. Store likes, shares, comments, reach per platform per post.
- **Performance scoring**: Real scores replacing current `brand_alignment_score` placeholder.
- **AI Coach**: Compare your last 10 posts against each other. Claude generates 3 specific improvement suggestions per platform.
- **Content calendar**: Visual grid view of all scheduled posts. Drag-and-drop rescheduling.
- **Brand Voice fine-tuning**: After 20 posts, analyze what performed best and auto-update brand voice bias in chromadb.
- **Credits economy**: Track AI usage. Show "remix credits used this month" on dashboard.

### New DB Tables Needed
```sql
-- Real analytics per post per platform
CREATE TABLE platform_analytics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID REFERENCES posts(id),
  platform     TEXT NOT NULL,
  ayrshare_id  TEXT,                    -- platform's post ID
  likes        INT DEFAULT 0,
  shares       INT DEFAULT 0,
  comments     INT DEFAULT 0,
  reach        INT DEFAULT 0,
  impressions  INT DEFAULT 0,
  synced_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Phase 3 — Automation & Video

### 7A. LuminaSocial MCP Server

Ship a first-party MCP server as a separate package (`@luminasocial/mcp`). This lets users manage their content pipeline via Claude Desktop, Cursor, or any MCP-compatible AI tool.

**Tools to expose:**
```
remix_content(input: str, platforms: list[str]) → PostBundle
schedule_post(post_id: str, datetime: str) → ScheduledPost
get_analytics(post_id: str) → AnalyticsReport
list_scheduled() → list[Post]
get_trending_topics(platform: str) → list[Trend]
approve_post(post_id: str) → Post
```

Reference: TryPost's built-in MCP server architecture + `tayler-id/social-media-mcp` for TypeScript implementation patterns.

### 7B. Faceless Video Generator

1. User provides a script or idea
2. Claude writes a 30-60 second narration script
3. ElevenLabs API (`pip install elevenlabs`) generates voiceover
4. Stable Diffusion or Flux API generates b-roll images per sentence
5. `moviepy` assembles: images + voiceover + auto-captions → `.mp4`
6. Upload to YouTube Shorts, TikTok, Instagram Reels via Ayrshare

Key libraries:
- `elevenlabs` — voiceover
- `moviepy` — video assembly (already have ffmpeg)
- Replicate API (`replicate`) — Flux image generation
- `whisper` or `faster-whisper` — auto-caption generation

### 7C. n8n / Make.com Webhook Nodes

- Ship an official n8n community node: `n8n-nodes-luminasocial`
- Trigger: "New post published" / "Post approved" / "Analytics ready"
- Action: "Create post" / "Remix content" / "Schedule post"

---

## 8. Phase 4 — Agency & Scale

- **Multi-workspace**: Each workspace has its own brand voice, connected accounts, API key
- **Client portal**: Read-only review links for client approvals (no login required)
- **White-label API**: Full REST API with custom domain support
- **Zernio migration**: Switch from Ayrshare to Zernio for 40x rate limits and per-account pricing
- **Credits economy**: Tiered plans with credit pools; credits consumed by AI remixes, video generation, analytics syncs
- **Team RBAC**: Owner / Editor / Reviewer / Viewer roles

---

## 9. Competitive Positioning

| Feature | LuminaSocial v2 | Blotato | Buffer | Ayrshare |
|---|---|---|---|---|
| Content Remixer | ✅ Phase 1 | ✅ Core feature | ❌ | ❌ |
| AI generation | ✅ Claude | ✅ GPT-4 + Claude | ❌ | ❌ |
| Developer API | ✅ Phase 1 | ✅ | Limited | ✅ Core |
| MCP server | ✅ Phase 3 | ❌ | ❌ | ❌ |
| Faceless video | ✅ Phase 3 | ✅ | ❌ | ❌ |
| Viral AI Coach | ✅ Phase 2 | ✅ | ❌ | ❌ |
| Open source | Partially | ❌ | ❌ | ❌ |
| Platforms | 13 (via Ayrshare) | 9 | 8 | 13 |
| Starting price | TBD | $29/mo | $6/channel/mo | $49/mo |

---

## 10. Immediate Next Steps (Phase 1 Sprint)

1. **Sign up for Ayrshare** (free tier = 20 posts/month, sufficient for MVP)
2. **Add `AYRSHARE_API_KEY` to `.env`**
3. **Build `POST /remix` endpoint** with LangGraph + Claude + Pydantic PostBundle
4. **Build `/remix` frontend page** — input area + platform cards + schedule modal
5. **Wire "Publish Now"** through Ayrshare integration
6. **Update sidebar** — "Remix" replaces "New Post" as primary action
7. **Run migration** for `post_bundles` table

Estimated Phase 1 build time: **3–5 days** of focused development.

---

## 11. Tech Stack Summary (v2)

```
Frontend:   Next.js 14, Tailwind, SWR, Recharts, Lucide React
Backend:    FastAPI, asyncpg, SQLAlchemy
AI:         Claude claude-sonnet-4-6 (Anthropic SDK), LangGraph, Pydantic
Publishing: Ayrshare API (Phase 1) → Zernio (Phase 3)
Video:      moviepy, ElevenLabs, Replicate/Flux (Phase 3)
Vector:     ChromaDB (brand voice RAG)
Scheduler:  APScheduler or Temporal (for analytics sync jobs)
Auth:       Authlib (OAuth flows, Phase 2)
MCP:        First-party server (Phase 3)
DB:         PostgreSQL + asyncpg
Infra:      Docker, Railway/Render
```
