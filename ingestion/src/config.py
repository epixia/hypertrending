"""Configuration settings for the ingestion service."""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str = Field(..., env="SUPABASE_URL")
    supabase_service_key: Optional[str] = Field(None, env="SUPABASE_SERVICE_KEY")
    supabase_anon_key: Optional[str] = Field(None, env="SUPABASE_ANON_KEY")

    # Ingestion defaults
    default_region: str = Field("US", env="DEFAULT_REGION")
    default_language: str = Field("en-US", env="DEFAULT_LANGUAGE")
    fetch_interval_minutes: int = Field(60, env="FETCH_INTERVAL_MINUTES")

    # Rate limiting
    pytrends_requests_per_minute: int = Field(10, env="PYTRENDS_REQUESTS_PER_MINUTE")
    pytrends_retry_delay_seconds: int = Field(60, env="PYTRENDS_RETRY_DELAY_SECONDS")

    # Logging
    log_level: str = Field("INFO", env="LOG_LEVEL")

    @property
    def supabase_key(self) -> str:
        """Get the best available Supabase key (service key preferred)."""
        return self.supabase_service_key or self.supabase_anon_key or ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Source codes matching the database enum
class SourceCode:
    GOOGLE_TRENDS = "GOOGLE_TRENDS"
    YOUTUBE = "YOUTUBE"
    X = "X"
    REDDIT = "REDDIT"
    TIKTOK = "TIKTOK"
    GOOGLE_NEWS = "GOOGLE_NEWS"
    CUSTOM = "CUSTOM"


# Time windows matching the database enum
class TimeWindow:
    H1 = "1h"
    H4 = "4h"
    H24 = "24h"
    D7 = "7d"
    D30 = "30d"
    D90 = "90d"


# Time granularity matching the database enum
class TimeGranularity:
    MINUTE = "minute"
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"


# Region codes for Google Trends
REGIONS = {
    "GLOBAL": "",
    "US": "US",
    "GB": "GB",
    "CA": "CA",
    "AU": "AU",
    "DE": "DE",
    "FR": "FR",
    "JP": "JP",
    "IN": "IN",
    "BR": "BR",
    "MX": "MX",
}

# Category codes for Google Trends (subset of most useful)
CATEGORIES = {
    "all": 0,
    "arts_entertainment": 3,
    "autos_vehicles": 47,
    "beauty_fitness": 44,
    "books_literature": 22,
    "business_industrial": 12,
    "computers_electronics": 5,
    "finance": 7,
    "food_drink": 71,
    "games": 8,
    "health": 45,
    "hobbies_leisure": 64,
    "home_garden": 11,
    "internet_telecom": 13,
    "jobs_education": 958,
    "law_government": 19,
    "news": 16,
    "online_communities": 299,
    "people_society": 14,
    "pets_animals": 66,
    "real_estate": 29,
    "reference": 533,
    "science": 174,
    "shopping": 18,
    "sports": 20,
    "travel": 67,
}
