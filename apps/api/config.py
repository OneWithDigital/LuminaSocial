from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://lumina:lumina_secret@postgres:5432/luminasocial"
    api_secret_key: str = "change_me_in_production"

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"

    serpapi_api_key: str = ""
    trend_region: str = "US"

    storage_base_path: str = "/storage"
    ffmpeg_threads: int = 4

    viral_threshold_views: int = 10_000
    mid_threshold_views: int = 1_000

    guardrail_min_score: float = 70.0
    guardrail_auto_reject_below: float = 40.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
