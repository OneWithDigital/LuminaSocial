"""
Shopify AI Toolkit — pulls product data from a Shopify store and feeds it
into LuminaSocial's content remixer to generate platform-tailored social posts.

Endpoints:
  GET  /shopify/status              — verify credentials & connectivity
  GET  /shopify/products            — list products from the store
  GET  /shopify/products/{id}       — get a single product with full detail
  POST /shopify/remix               — generate social drafts for a product
"""
import json
import re
from typing import Optional

import anthropic
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.connection import get_db
from config import get_settings
from routers.remix import PLATFORM_RULES, PlatformDraft, RemixBundle

router = APIRouter()


# ── Shopify Admin REST helpers ─────────────────────────────────────────────────

def _shopify_headers(token: str) -> dict:
    return {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
    }


def _shopify_url(store: str, version: str, path: str) -> str:
    host = store.rstrip("/")
    if not host.startswith("http"):
        host = f"https://{host}"
    return f"{host}/admin/api/{version}{path}"


async def _shopify_get(path: str) -> dict:
    cfg = get_settings()
    if not cfg.shopify_store_url or not cfg.shopify_access_token:
        raise HTTPException(
            status_code=503,
            detail="Shopify not configured. Set SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN.",
        )
    url = _shopify_url(cfg.shopify_store_url, cfg.shopify_api_version, path)
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(url, headers=_shopify_headers(cfg.shopify_access_token))
    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid Shopify access token.")
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="Shopify resource not found.")
    resp.raise_for_status()
    return resp.json()


# ── Data models ────────────────────────────────────────────────────────────────

class ShopifyProduct(BaseModel):
    id: int
    title: str
    body_html: Optional[str] = None
    vendor: Optional[str] = None
    product_type: Optional[str] = None
    tags: str = ""
    status: str = "active"
    handle: str = ""
    variants: list[dict] = []
    images: list[dict] = []


class ProductRemixRequest(BaseModel):
    product_id: int
    platforms: list[str] = list(PLATFORM_RULES.keys())
    extra_context: Optional[str] = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _product_to_text(p: ShopifyProduct) -> str:
    body = re.sub(r"<[^>]+>", " ", p.body_html or "").strip()
    body = re.sub(r"\s+", " ", body)
    price = ""
    if p.variants:
        prices = sorted({v.get("price", "") for v in p.variants if v.get("price")})
        if prices:
            price = f"Price: {prices[0]}" if len(prices) == 1 else f"Price range: {prices[0]}–{prices[-1]}"
    parts = [
        f"Product: {p.title}",
        f"Brand: {p.vendor}" if p.vendor else "",
        f"Type: {p.product_type}" if p.product_type else "",
        price,
        f"Tags: {p.tags}" if p.tags else "",
        f"Description: {body[:1500]}" if body else "",
    ]
    return "\n".join(x for x in parts if x)


def _build_product_prompt(
    product_text: str,
    platforms: list[str],
    brand_voice: Optional[str],
    brand_keywords: list[str],
    extra_context: Optional[str],
) -> str:
    rules_block = "\n".join(
        f"""
=== {PLATFORM_RULES[p]["name"]} (key: "{p}") ===
Char limit: {PLATFORM_RULES[p]["char_limit"]} total | Body limit: {PLATFORM_RULES[p]["body_limit"]}
Tone: {PLATFORM_RULES[p]["tone"]}
Hashtags: {PLATFORM_RULES[p]["hashtags"]}
Notes: {PLATFORM_RULES[p]["notes"]}"""
        for p in platforms
        if p in PLATFORM_RULES
    )

    brand_block = ""
    if brand_voice:
        brand_block += f"\n\nBrand voice: {brand_voice}"
    if brand_keywords:
        brand_block += f"\nBrand keywords to weave in naturally: {', '.join(brand_keywords)}"
    if extra_context:
        brand_block += f"\nExtra context from marketer: {extra_context}"

    return f"""You are a world-class e-commerce social media strategist. Your job is to take a Shopify product and write platform-native promotional posts that drive desire and clicks — not generic product descriptions.

PRODUCT DATA:
{product_text}
{brand_block}

PLATFORM SPECS:
{rules_block}

OUTPUT — return ONLY a valid JSON object, no markdown fences, no explanation:
{{
  "source_summary": "one-sentence summary of what this product is and who it's for",
  "drafts": [
    {{
      "platform": "<platform key exactly as shown>",
      "platform_name": "<display name>",
      "body": "<post body WITHOUT hashtags — make it compelling and platform-native>",
      "hashtags": ["hashtag1", "hashtag2"]
    }}
  ]
}}

Critical rules:
- body must NOT contain hashtags — they belong in the hashtags array
- body length must respect the body_limit for that platform
- Twitter body must be 240 chars or fewer (hard limit)
- Every post must feel native and promotional — drive curiosity or desire
- Return exactly one draft per requested platform"""


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/status")
async def shopify_status():
    """Verify Shopify credentials and return basic shop info."""
    data = await _shopify_get("/shop.json")
    shop = data.get("shop", {})
    return {
        "connected": True,
        "shop_name": shop.get("name"),
        "shop_domain": shop.get("domain"),
        "plan": shop.get("plan_name"),
        "currency": shop.get("currency"),
    }


@router.get("/products")
async def list_products(
    limit: int = Query(default=20, le=250),
    status: str = Query(default="active"),
    title: Optional[str] = Query(default=None),
):
    """List products from the connected Shopify store."""
    qs = f"?limit={limit}&status={status}"
    if title:
        qs += f"&title={title}"
    data = await _shopify_get(f"/products.json{qs}")
    products = data.get("products", [])
    return [
        {
            "id": p["id"],
            "title": p["title"],
            "vendor": p.get("vendor"),
            "product_type": p.get("product_type"),
            "status": p.get("status"),
            "handle": p.get("handle"),
            "tags": p.get("tags", ""),
            "price": p["variants"][0]["price"] if p.get("variants") else None,
            "image_url": p["images"][0]["src"] if p.get("images") else None,
        }
        for p in products
    ]


@router.get("/products/{product_id}")
async def get_product(product_id: int):
    """Get a single Shopify product with full detail."""
    data = await _shopify_get(f"/products/{product_id}.json")
    return data.get("product", {})


@router.post("/remix", response_model=RemixBundle)
async def remix_product(
    payload: ProductRemixRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate platform-tailored social media drafts from a Shopify product."""
    cfg = get_settings()

    # Fetch product from Shopify
    data = await _shopify_get(f"/products/{payload.product_id}.json")
    raw = data.get("product")
    if not raw:
        raise HTTPException(status_code=404, detail="Product not found in Shopify.")

    product = ShopifyProduct(
        id=raw["id"],
        title=raw["title"],
        body_html=raw.get("body_html"),
        vendor=raw.get("vendor"),
        product_type=raw.get("product_type"),
        tags=raw.get("tags", ""),
        status=raw.get("status", "active"),
        handle=raw.get("handle", ""),
        variants=raw.get("variants", []),
        images=raw.get("images", []),
    )

    # Load brand context
    row = (await db.execute(
        text("SELECT brand_voice, brand_keywords FROM user_profiles ORDER BY id LIMIT 1")
    )).mappings().first()
    brand_voice    = row["brand_voice"]    if row else None
    brand_keywords = row["brand_keywords"] if row else []

    # Filter to valid requested platforms
    platforms = [p for p in payload.platforms if p in PLATFORM_RULES]
    if not platforms:
        raise HTTPException(status_code=422, detail="No valid platforms selected.")

    product_text = _product_to_text(product)
    prompt = _build_product_prompt(
        product_text, platforms, brand_voice, brand_keywords, payload.extra_context
    )

    client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
    msg = client.messages.create(
        model=cfg.anthropic_model,
        max_tokens=2500,
        messages=[{"role": "user", "content": prompt}],
    )

    raw_json = msg.content[0].text.strip()
    raw_json = re.sub(r"```[a-z]*\n?", "", raw_json).strip().rstrip("`")

    try:
        result = json.loads(raw_json)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI returned malformed JSON: {e}")

    drafts = [
        PlatformDraft(
            platform=d["platform"],
            platform_name=PLATFORM_RULES.get(d["platform"], {}).get("name", d["platform"]),
            body=d.get("body", ""),
            hashtags=d.get("hashtags", []),
            char_limit=PLATFORM_RULES.get(d["platform"], {}).get("char_limit", 2200),
        )
        for d in result.get("drafts", [])
        if d.get("platform") in PLATFORM_RULES
    ]

    # Log remix usage
    await db.execute(text("INSERT INTO remix_usage (id) VALUES (uuid_generate_v4())"))
    await db.commit()

    return RemixBundle(source_summary=result.get("source_summary", ""), drafts=drafts)
