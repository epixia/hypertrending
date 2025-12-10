"""Base classes for data fetchers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from enum import Enum


@dataclass
class TimeseriesPoint:
    """A single point in a timeseries."""

    timestamp: datetime
    value: int  # 0-100 interest value
    is_partial: bool = False
    metadata: Optional[dict] = None


@dataclass
class TrendData:
    """Trend data for a single keyword."""

    keyword: str
    region: str
    source: str
    timeseries: list[TimeseriesPoint] = field(default_factory=list)
    related_queries: list[str] = field(default_factory=list)
    rising_queries: list[dict] = field(default_factory=list)  # {"query": str, "value": int}
    current_interest: int = 0
    baseline_interest: int = 0
    trend_score: float = 0.0
    metadata: Optional[dict] = None

    def calculate_trend_score(self) -> float:
        """Calculate trend score based on current vs baseline interest."""
        if self.baseline_interest == 0:
            return 999.99 if self.current_interest > 0 else 0.0
        return round(
            ((self.current_interest - self.baseline_interest) / self.baseline_interest) * 100, 2
        )

    def calculate_from_timeseries(self):
        """Calculate current interest, baseline, and trend score from timeseries."""
        if not self.timeseries:
            return

        values = [p.value for p in self.timeseries]

        # Current interest = latest value
        self.current_interest = values[-1] if values else 0

        # Baseline = average of first half of the timeseries
        first_half = values[: len(values) // 2] if len(values) > 1 else values
        self.baseline_interest = int(sum(first_half) / len(first_half)) if first_half else 0

        # Calculate trend score
        self.trend_score = self.calculate_trend_score()


class BaseFetcher(ABC):
    """Abstract base class for trend data fetchers."""

    source_code: str = "CUSTOM"

    @abstractmethod
    def fetch_trending(
        self,
        region: str = "US",
        category: int = 0,
        limit: int = 20,
    ) -> list[TrendData]:
        """Fetch currently trending keywords/topics.

        Args:
            region: Region code (e.g., 'US', 'GB')
            category: Category ID (0 = all categories)
            limit: Maximum number of results

        Returns:
            List of TrendData objects for trending keywords
        """
        pass

    @abstractmethod
    def fetch_interest_over_time(
        self,
        keywords: list[str],
        region: str = "US",
        timeframe: str = "now 7-d",
    ) -> dict[str, TrendData]:
        """Fetch interest over time for specific keywords.

        Args:
            keywords: List of keywords to fetch (max 5 per request)
            region: Region code
            timeframe: Timeframe string (e.g., 'now 7-d', 'today 1-m')

        Returns:
            Dict mapping keyword to TrendData
        """
        pass

    @abstractmethod
    def fetch_related_queries(
        self,
        keyword: str,
        region: str = "US",
        timeframe: str = "now 7-d",
    ) -> tuple[list[str], list[dict]]:
        """Fetch related queries for a keyword.

        Args:
            keyword: The keyword to find related queries for
            region: Region code
            timeframe: Timeframe string

        Returns:
            Tuple of (top_queries, rising_queries)
        """
        pass
