"""Mission runner for executing trend hunting jobs."""

import logging
import time
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, field

from ..config import get_settings, SourceCode, TimeWindow, REGIONS
from ..fetchers import GoogleTrendsFetcher, TrendData
from ..storage import SupabaseStorage

logger = logging.getLogger(__name__)


@dataclass
class MissionConfig:
    """Configuration for a mission run."""

    sources: list[str] = field(default_factory=lambda: [SourceCode.GOOGLE_TRENDS])
    regions: list[str] = field(default_factory=lambda: ["US"])
    time_windows: list[str] = field(default_factory=lambda: [TimeWindow.H24])
    categories: list[int] = field(default_factory=lambda: [0])  # 0 = all
    min_trend_score: float = 0.0
    min_interest: int = 0
    max_results_per_region: int = 50
    fetch_timeseries: bool = True
    fetch_related: bool = True
    keywords_filter: Optional[dict] = None  # {"include": [], "exclude": []}

    @classmethod
    def from_dict(cls, config: dict) -> "MissionConfig":
        """Create MissionConfig from dict (e.g., from database JSON)."""
        return cls(
            sources=config.get("sources", [SourceCode.GOOGLE_TRENDS]),
            regions=config.get("regions", ["US"]),
            time_windows=config.get("time_windows", [TimeWindow.H24]),
            categories=config.get("categories", [0]),
            min_trend_score=config.get("min_trend_score", 0.0),
            min_interest=config.get("min_interest", 0),
            max_results_per_region=config.get("max_results_per_region", 50),
            fetch_timeseries=config.get("fetch_timeseries", True),
            fetch_related=config.get("fetch_related", True),
            keywords_filter=config.get("keywords_filter"),
        )


@dataclass
class RunStats:
    """Statistics for a mission run."""

    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    keywords_scanned: int = 0
    keywords_matched: int = 0
    regions_scanned: int = 0
    api_calls_made: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def duration_ms(self) -> int:
        """Get duration in milliseconds."""
        if not self.completed_at:
            return 0
        delta = self.completed_at - self.started_at
        return int(delta.total_seconds() * 1000)

    def to_dict(self) -> dict:
        """Convert to dict for storage."""
        return {
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_ms": self.duration_ms,
            "keywords_scanned": self.keywords_scanned,
            "keywords_matched": self.keywords_matched,
            "regions_scanned": self.regions_scanned,
            "api_calls_made": self.api_calls_made,
            "errors": self.errors,
        }


class MissionRunner:
    """Runner for executing trend hunting missions."""

    def __init__(self):
        """Initialize the mission runner."""
        self.settings = get_settings()
        self.storage = SupabaseStorage()
        self._fetchers: dict[str, GoogleTrendsFetcher] = {}

    def get_fetcher(self, source_code: str) -> Optional[GoogleTrendsFetcher]:
        """Get or create a fetcher for a source."""
        if source_code == SourceCode.GOOGLE_TRENDS:
            if source_code not in self._fetchers:
                self._fetchers[source_code] = GoogleTrendsFetcher()
            return self._fetchers[source_code]

        # TODO: Add other source fetchers (YouTube, Reddit, etc.)
        logger.warning(f"No fetcher available for source: {source_code}")
        return None

    def run_mission(
        self,
        mission_id: str,
        triggered_by: Optional[str] = None,
    ) -> tuple[bool, RunStats]:
        """Execute a mission and store results.

        Args:
            mission_id: Mission UUID
            triggered_by: User UUID who triggered the run

        Returns:
            Tuple of (success, stats)
        """
        stats = RunStats()

        # Get mission config
        mission = self.storage.get_mission(mission_id)
        if not mission:
            logger.error(f"Mission not found: {mission_id}")
            stats.errors.append("Mission not found")
            return False, stats

        if mission["status"] != "ACTIVE":
            logger.warning(f"Mission {mission_id} is not active")
            stats.errors.append("Mission is not active")
            return False, stats

        config = MissionConfig.from_dict(mission.get("config", {}))
        logger.info(f"Starting mission: {mission['name']} (ID: {mission_id})")

        # Create mission run
        run_id = self.storage.create_mission_run(mission_id, triggered_by)
        if not run_id:
            stats.errors.append("Failed to create mission run")
            return False, stats

        # Update run status to RUNNING
        self.storage.update_mission_run(run_id, "RUNNING")

        try:
            # Execute mission for each source
            all_results: list[TrendData] = []

            for source_code in config.sources:
                fetcher = self.get_fetcher(source_code)
                if not fetcher:
                    continue

                # Fetch for each region
                for region in config.regions:
                    logger.info(f"Fetching trends for {source_code} in {region}")
                    stats.regions_scanned += 1

                    try:
                        # Get trending keywords
                        trending = fetcher.fetch_trending(
                            region=region,
                            limit=config.max_results_per_region,
                        )
                        stats.api_calls_made += 1
                        stats.keywords_scanned += len(trending)

                        # Enrich with timeseries if configured
                        if config.fetch_timeseries and trending:
                            keywords = [t.keyword for t in trending[:5]]  # Top 5 for timeseries
                            for time_window in config.time_windows:
                                try:
                                    timeseries_data = fetcher.fetch_interest_over_time(
                                        keywords=keywords,
                                        region=region,
                                        timeframe=time_window,
                                    )
                                    stats.api_calls_made += 1

                                    # Merge timeseries into trending data
                                    for trend in trending:
                                        if trend.keyword in timeseries_data:
                                            ts_data = timeseries_data[trend.keyword]
                                            trend.timeseries = ts_data.timeseries
                                            trend.calculate_from_timeseries()

                                except Exception as e:
                                    logger.error(f"Error fetching timeseries: {e}")
                                    stats.errors.append(f"Timeseries error: {str(e)}")

                        # Fetch related queries for top keywords
                        if config.fetch_related and trending:
                            for trend in trending[:3]:  # Top 3 for related queries
                                try:
                                    top_queries, rising_queries = fetcher.fetch_related_queries(
                                        keyword=trend.keyword,
                                        region=region,
                                    )
                                    stats.api_calls_made += 1
                                    trend.related_queries = top_queries
                                    trend.rising_queries = rising_queries
                                except Exception as e:
                                    logger.error(f"Error fetching related queries: {e}")

                        # Filter results
                        filtered = self._filter_results(trending, config)
                        stats.keywords_matched += len(filtered)
                        all_results.extend(filtered)

                    except Exception as e:
                        logger.error(f"Error fetching from {source_code} for {region}: {e}")
                        stats.errors.append(f"{source_code}/{region}: {str(e)}")

            # Store results
            if all_results:
                # Sort by trend score and take top results
                all_results.sort(key=lambda x: x.trend_score, reverse=True)
                top_results = all_results[:config.max_results_per_region * len(config.regions)]

                stored_count = self.storage.store_mission_run_results(
                    run_id=run_id,
                    trend_data_list=top_results,
                    time_window=config.time_windows[0] if config.time_windows else TimeWindow.H24,
                )
                logger.info(f"Stored {stored_count} results for run {run_id}")

            # Mark run as completed
            stats.completed_at = datetime.now(timezone.utc)
            self.storage.update_mission_run(
                run_id=run_id,
                status="COMPLETED",
                keywords_scanned=stats.keywords_scanned,
                keywords_matched=stats.keywords_matched,
                stats=stats.to_dict(),
            )

            logger.info(
                f"Mission completed: {stats.keywords_matched}/{stats.keywords_scanned} keywords, "
                f"{stats.duration_ms}ms"
            )
            return True, stats

        except Exception as e:
            logger.error(f"Mission failed: {e}")
            stats.completed_at = datetime.now(timezone.utc)
            stats.errors.append(str(e))

            self.storage.update_mission_run(
                run_id=run_id,
                status="FAILED",
                keywords_scanned=stats.keywords_scanned,
                keywords_matched=stats.keywords_matched,
                error_message=str(e),
                stats=stats.to_dict(),
            )
            return False, stats

    def _filter_results(
        self,
        results: list[TrendData],
        config: MissionConfig,
    ) -> list[TrendData]:
        """Filter results based on mission config.

        Args:
            results: List of TrendData to filter
            config: Mission configuration

        Returns:
            Filtered list of TrendData
        """
        filtered = []

        for trend in results:
            # Check trend score threshold
            if trend.trend_score < config.min_trend_score:
                continue

            # Check interest threshold
            if trend.current_interest < config.min_interest:
                continue

            # Check keyword filters
            if config.keywords_filter:
                keyword_lower = trend.keyword.lower()

                # Check exclude list
                exclude = config.keywords_filter.get("exclude", [])
                if any(exc.lower() in keyword_lower for exc in exclude):
                    continue

                # Check include list (if specified, keyword must match)
                include = config.keywords_filter.get("include", [])
                if include and not any(inc.lower() in keyword_lower for inc in include):
                    continue

            filtered.append(trend)

        return filtered

    def run_quick_scan(
        self,
        regions: list[str] = None,
        limit: int = 20,
    ) -> list[TrendData]:
        """Run a quick trending scan without a mission.

        Args:
            regions: List of region codes (default: ['US'])
            limit: Max results per region

        Returns:
            List of TrendData from all regions
        """
        regions = regions or ["US"]
        fetcher = self.get_fetcher(SourceCode.GOOGLE_TRENDS)
        if not fetcher:
            return []

        all_results = []

        for region in regions:
            try:
                trending = fetcher.fetch_trending(region=region, limit=limit)
                all_results.extend(trending)
            except Exception as e:
                logger.error(f"Error in quick scan for {region}: {e}")

        return all_results

    def run_keyword_analysis(
        self,
        keywords: list[str],
        region: str = "US",
        timeframe: str = "7d",
    ) -> dict[str, TrendData]:
        """Analyze specific keywords (without a mission).

        Args:
            keywords: List of keywords to analyze
            region: Region code
            timeframe: Time window

        Returns:
            Dict mapping keyword to TrendData
        """
        fetcher = self.get_fetcher(SourceCode.GOOGLE_TRENDS)
        if not fetcher:
            return {}

        results = {}

        # Fetch in batches of 5 (pytrends limit)
        for i in range(0, len(keywords), 5):
            batch = keywords[i : i + 5]
            try:
                batch_results = fetcher.fetch_interest_over_time(
                    keywords=batch,
                    region=region,
                    timeframe=timeframe,
                )
                results.update(batch_results)

                # Fetch related queries for each
                for keyword in batch:
                    if keyword in results:
                        top, rising = fetcher.fetch_related_queries(keyword, region, timeframe)
                        results[keyword].related_queries = top
                        results[keyword].rising_queries = rising

            except Exception as e:
                logger.error(f"Error analyzing keywords {batch}: {e}")

        return results
