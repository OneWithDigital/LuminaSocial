from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Core ──────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://lumina:lumina_secret@postgres:5432/luminasocial"
    api_secret_key: str = "change_me_in_production"

    # ── Anthropic (guardrail + feedback loop) ─────────────────────────
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"

    # ── OpenAI (optional: caption generation, embeddings) ────────────
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # ── Trend ingestion ───────────────────────────────────────────────
    serpapi_api_key: str = ""
    trend_region: str = "US"
    trend_fetch_interval_minutes: int = 60

    # ── Video factory ─────────────────────────────────────────────────
    storage_base_path: str = "/storage"
    ffmpeg_threads: int = 4

    # ── Instagram Graph API ───────────────────────────────────────────
    instagram_access_token: str = ""
    instagram_account_id: str = ""

    # ── TikTok Content Posting API ────────────────────────────────────
    tiktok_access_token: str = ""
    tiktok_client_key: str = ""
    tiktok_client_secret: str = ""

    # ── YouTube Data API v3 ───────────────────────────────────────────
    youtube_api_key: str = ""
    youtube_channel_id: str = ""

    # ── Analytics thresholds ──────────────────────────────────────────
    viral_threshold_views: int = 10_000
    mid_threshold_views: int = 1_000

    # ── Brand guardrail ───────────────────────────────────────────────
    guardrail_min_score: float = 70.0
    guardrail_auto_reject_below: float = 40.0

    # ── Shopify ───────────────────────────────────────────────────────
    shopify_store_url: str = ""          # e.g. mystore.myshopify.com
    shopify_access_token: str = ""       # Admin API access token
    shopify_api_version: str = "2024-10"


@lru_cache
def get_settings() -> Settings:
    return Settings()
