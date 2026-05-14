from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class TrendWorkerSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://lumina:lumina_secret@postgres:5432/luminasocial"
    serpapi_api_key: str = ""
    trend_region: str = "US"
    trend_fetch_interval_minutes: int = 60


@lru_cache
def get_settings() -> TrendWorkerSettings:
    return TrendWorkerSettings()
