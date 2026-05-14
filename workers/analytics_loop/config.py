from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class AnalyticsWorkerSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://lumina:lumina_secret@postgres:5432/luminasocial"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    analytics_poll_interval_minutes: int = 360
    viral_threshold_views: int = 10_000
    mid_threshold_views: int = 1_000


@lru_cache
def get_settings() -> AnalyticsWorkerSettings:
    return AnalyticsWorkerSettings()
