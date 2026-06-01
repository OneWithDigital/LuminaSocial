#!/usr/bin/env python3
"""
LuminaSocial MCP Server
=======================
Exposes your LuminaSocial content pipeline as tools for Claude Desktop
and any MCP-compatible AI assistant.

Tools available:
  remix_content         — Generate multi-platform drafts from any idea/text
  remix_url             — Fetch a URL and remix it into platform drafts
  list_posts            — Browse your content queue with filters
  approve_post          — Approve a post (optionally with a schedule time)
  reject_post           — Reject a post
  get_upcoming          — See what's scheduled next
  get_trends            — View trending topics for content inspiration
  run_ai_coach          — Get Claude-powered improvement suggestions
  get_dashboard_stats   — Quick pipeline overview
  shopify_status        — Check Shopify store connection
  shopify_list_products — List products from your Shopify store
  shopify_remix_product — Generate social posts for a Shopify product

Setup: set LUMINASOCIAL_API_URL env var if your API runs on a port other
than 8000. Default: http://localhost:8000
"""

import os
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP

API_URL = os.environ.get("LUMINASOCIAL_API_URL", "http://localhost:8000")

mcp = FastMCP(
    "LuminaSocial Ultra",
    instructions=(
        "You are connected to a LuminaSocial content pipeline. "
        "You can remix content, manage the post queue, approve or reject posts, "
        "browse trends, and run the AI Coach. Always confirm before approving or rejecting posts."
    ),
)


# ── HTTP helpers ───────────────────────────────────────────────────────────────

async def _get(path: str) -> dict | list:
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(f"{API_URL}{path}")
        r.raise_for_status()
        return r.json()


async def _post(path: str, body: dict) -> dict:
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{API_URL}{path}", json=body)
        r.raise_for_status()
        return r.json()


async def _patch(path: str, body: dict) -> dict:
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.patch(f"{API_URL}{path}", json=body)
        r.raise_for_status()
        return r.json()


# ── Tools ──────────────────────────────────────────────────────────────────────

@mcp.tool()
async def remix_content(
    input_text: str,
    platforms: list[str] = ["facebook", "instagram", "tiktok", "linkedin", "twitter", "youtube_shorts"],
) -> str:
    """
    Generate platform-tailored social media drafts from any idea or text.

    Each draft is optimized for that platform's tone, character limit, and
    hashtag norms. Your brand voice from your profile is automatically applied.

    Args:
        input_text: The idea, topic, or content you want to turn into posts.
        platforms:  Which platforms to generate for. Defaults to all 6.
    """
    result = await _post("/remix/generate", {
        "input_type": "text",
        "content": input_text,
        "platforms": platforms,
    })
    return _format_bundle(result)


@mcp.tool()
async def remix_url(
    url: str,
    platforms: list[str] = ["facebook", "instagram", "tiktok", "linkedin", "twitter", "youtube_shorts"],
) -> str:
    """
    Fetch any URL (blog, article, product page) and remix it into platform drafts.

    Args:
        url:       The URL to fetch and remix.
        platforms: Which platforms to generate for. Defaults to all 6.
    """
    result = await _post("/remix/generate", {
        "input_type": "url",
        "content": url,
        "platforms": platforms,
    })
    return _format_bundle(result)


def _format_bundle(result: dict) -> str:
    lines = [f"Source summary: {result['source_summary']}\n"]
    for draft in result.get("drafts", []):
        hashtags = " ".join(f"#{h.lstrip('#')}" for h in draft["hashtags"])
        char_used = len(draft["body"]) + (1 + len(hashtags) if hashtags else 0)
        lines += [
            f"── {draft['platform_name']} ({char_used}/{draft['char_limit']} chars) ──",
            draft["body"],
            hashtags or "(no hashtags)",
            "",
        ]
    return "\n".join(lines)


@mcp.tool()
async def list_posts(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    limit: int = 15,
) -> str:
    """
    List posts from the content queue.

    Args:
        status:   Filter by status: Draft | Pending | Approved | Published | Rejected
        platform: Filter by platform: facebook | instagram | tiktok | linkedin | twitter | youtube_shorts
        limit:    Max number of posts to return (default 15).
    """
    qs_parts = [f"limit={limit}"]
    if status:
        qs_parts.append(f"status={status}")
    if platform:
        qs_parts.append(f"platform={platform}")

    posts = await _get(f"/posts?{'&'.join(qs_parts)}")
    if not posts:
        return "No posts found matching those filters."

    lines = [f"{len(posts)} post(s):\n"]
    for p in posts:
        lines.append(f"[{p['status'].upper()}] {p['title']}")
        lines.append(f"  id:       {p['id']}")
        lines.append(f"  platform: {p['platform_target']}")
        if p.get("scheduled_at"):
            lines.append(f"  scheduled:{p['scheduled_at'][:16]}")
        if p.get("caption_draft"):
            preview = p["caption_draft"][:120].replace("\n", " ")
            lines.append(f"  caption:  {preview}…")
        lines.append("")

    return "\n".join(lines)


@mcp.tool()
async def approve_post(
    post_id: str,
    scheduled_at: Optional[str] = None,
) -> str:
    """
    Approve a post for publishing.

    Args:
        post_id:      UUID of the post (get it from list_posts).
        scheduled_at: Optional ISO 8601 datetime, e.g. "2026-05-20T09:00:00".
                      If omitted the post is approved without a specific schedule.
    """
    result = await _patch(f"/posts/{post_id}/approve", {
        "approved_by": "mcp_assistant",
        "scheduled_at": scheduled_at,
    })
    msg = f"✅ Approved: \"{result['title']}\""
    if result.get("scheduled_at"):
        msg += f"\nScheduled for: {result['scheduled_at'][:16]}"
    return msg


@mcp.tool()
async def reject_post(post_id: str) -> str:
    """
    Reject a post — moves it to Rejected status in the queue.

    Args:
        post_id: UUID of the post to reject (get it from list_posts).
    """
    result = await _patch(f"/posts/{post_id}/reject", {})
    return f"❌ Rejected post: {result['id']}"


@mcp.tool()
async def get_upcoming(limit: int = 10) -> str:
    """Show posts that are approved and scheduled for future publishing."""
    posts = await _get(f"/posts?status=Approved&limit=50")
    scheduled = sorted(
        [p for p in posts if p.get("scheduled_at")],
        key=lambda p: p["scheduled_at"],
    )[:limit]

    if not scheduled:
        return "No posts are scheduled yet. Approve a post with a scheduled_at time to see it here."

    lines = [f"📅 {len(scheduled)} upcoming post(s):\n"]
    for p in scheduled:
        lines.append(f"• {p['scheduled_at'][:16]}  [{p['platform_target']}]  {p['title']}")
        lines.append(f"  id: {p['id']}")
    return "\n".join(lines)


@mcp.tool()
async def get_trends(limit: int = 10) -> str:
    """
    Get current trending topics to inspire your next post.

    Args:
        limit: Number of trends to return (default 10).
    """
    trends = await _get(f"/trends?limit={limit}")
    if not trends:
        return "No trends in the database yet."

    lines = [f"🔥 {len(trends)} trending topic(s):\n"]
    for t in trends:
        vol = f" — {t['search_volume']:,} searches" if t.get("search_volume") else ""
        lines.append(f"• {t['keyword']}{vol} ({t.get('region', 'US')})")
        if t.get("related_topics"):
            lines.append(f"  Related: {', '.join(t['related_topics'][:4])}")
    return "\n".join(lines)


@mcp.tool()
async def run_ai_coach() -> str:
    """
    Run the AI Coach — Claude analyzes your recent posts, brand voice,
    and A/B test lessons to generate specific, actionable improvement tips.
    Takes about 10–15 seconds.
    """
    result = await _post("/coach/analyze", {})

    lines = [
        "🎯 AI Coach Report",
        f"(Analyzed {result['analyzed_posts']} posts, {result['analyzed_lessons']} lessons)\n",
        "Overall Assessment:",
        result["overall_insight"],
        "",
        f"{len(result['suggestions'])} Recommendations:",
        "",
    ]
    for i, s in enumerate(result["suggestions"], 1):
        plat = s["platform"].upper() if s["platform"] else "ALL PLATFORMS"
        lines += [
            f"{i}. [{plat}] {s['headline']}",
            f"   Why: {s['detail']}",
            f"   Do: {s['action']}",
            "",
        ]
    return "\n".join(lines)


@mcp.tool()
async def get_dashboard_stats() -> str:
    """Get a quick overview of your LuminaSocial content pipeline."""
    posts = await _get("/posts?limit=200")
    usage = await _get("/remix/usage")

    tally: dict[str, int] = {}
    for p in posts:
        tally[p["status"]] = tally.get(p["status"], 0) + 1

    platform_tally: dict[str, int] = {}
    for p in [x for x in posts if x["status"] == "Published"]:
        platform_tally[p["platform_target"]] = platform_tally.get(p["platform_target"], 0) + 1

    top = max(platform_tally, key=platform_tally.get) if platform_tally else "none yet"

    lines = [
        "📊 LuminaSocial Dashboard\n",
        f"Total posts:  {len(posts)}",
        f"  Pending:    {tally.get('Pending', 0)}  ← needs your review",
        f"  Approved:   {tally.get('Approved', 0)}",
        f"  Published:  {tally.get('Published', 0)}",
        f"  Draft:      {tally.get('Draft', 0)}",
        f"  Rejected:   {tally.get('Rejected', 0)}",
        f"\nRemixes this month: {usage.get('month_count', 0)}",
        f"Top platform:       {top}",
    ]
    return "\n".join(lines)


# ── Shopify Tools ──────────────────────────────────────────────────────────────

@mcp.tool()
async def shopify_status() -> str:
    """
    Check whether your Shopify store is connected and return basic shop info.
    Configure the connection by setting SHOPIFY_STORE_URL and
    SHOPIFY_ACCESS_TOKEN in the LuminaSocial API .env file.
    """
    try:
        data = await _get("/shopify/status")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 503:
            return "Shopify not configured. Add SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN to your .env file."
        if e.response.status_code == 401:
            return "Shopify credentials invalid. Check your SHOPIFY_ACCESS_TOKEN."
        raise
    return (
        f"✅ Shopify connected\n"
        f"  Shop:     {data['shop_name']} ({data['shop_domain']})\n"
        f"  Plan:     {data['plan']}\n"
        f"  Currency: {data['currency']}"
    )


@mcp.tool()
async def shopify_list_products(
    limit: int = 20,
    status: str = "active",
    title: Optional[str] = None,
) -> str:
    """
    List products from your connected Shopify store.

    Args:
        limit:  Number of products to return (max 250, default 20).
        status: Product status filter — active | draft | archived (default active).
        title:  Optional title substring filter.
    """
    qs = f"?limit={limit}&status={status}"
    if title:
        qs += f"&title={title}"
    try:
        products = await _get(f"/shopify/products{qs}")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 503:
            return "Shopify not configured. Set SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN in .env."
        raise

    if not products:
        return "No products found matching those filters."

    lines = [f"{len(products)} product(s):\n"]
    for p in products:
        price = f"  price:  {p['price']}" if p.get("price") else ""
        lines += [
            f"[{p['status'].upper()}] {p['title']}",
            f"  id:     {p['id']}",
            f"  vendor: {p.get('vendor') or '—'}",
            f"  type:   {p.get('product_type') or '—'}",
            price,
            "",
        ]
    lines.append("Use shopify_remix_product(product_id=<id>) to generate social posts for any product.")
    return "\n".join(x for x in lines if x is not None)


@mcp.tool()
async def shopify_remix_product(
    product_id: int,
    platforms: list[str] = ["facebook", "instagram", "tiktok", "linkedin", "twitter", "youtube_shorts"],
    extra_context: Optional[str] = None,
) -> str:
    """
    Generate platform-tailored social media drafts for a Shopify product.

    Uses your store's product data (title, description, price, tags) combined
    with your brand voice to write promotional posts for each platform.

    Args:
        product_id:    Shopify product ID (get it from shopify_list_products).
        platforms:     Which platforms to generate for. Defaults to all 6.
        extra_context: Optional extra context for the AI, e.g. "launching next week"
                       or "highlight the new colour options".
    """
    body = {"product_id": product_id, "platforms": platforms}
    if extra_context:
        body["extra_context"] = extra_context

    try:
        result = await _post("/shopify/remix", body)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 503:
            return "Shopify not configured. Set SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN in .env."
        if e.response.status_code == 404:
            return f"Product {product_id} not found in your Shopify store."
        raise

    return _format_bundle(result)


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.run()
