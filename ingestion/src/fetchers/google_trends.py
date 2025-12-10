"""Google Trends data fetcher using pytrends."""

import time
import logging
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
from pytrends.request import TrendReq
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from .base import BaseFetcher, TrendData, TimeseriesPoint
from ..config import get_settings, SourceCode, REGIONS

logger = logging.getLogger(__name__)


class GoogleTrendsFetcher(BaseFetcher):
    """Fetcher for Google Trends data using pytrends."""

    source_code = SourceCode.GOOGLE_TRENDS

    # Timeframe mappings for pytrends
    TIMEFRAMES = {
        "1h": "now 1-H",
        "4h": "now 4-H",
        "24h": "now 1-d",
        "7d": "now 7-d",
        "30d": "today 1-m",
        "90d": "today 3-m",
        "12m": "today 12-m",
    }

    def __init__(self, hl: str = "en-US", tz: int = 360, retries: int = 3):
        """Initialize the Google Trends fetcher.

        Args:
            hl: Host language for Google Trends
            tz: Timezone offset in minutes
            retries: Number of retries for failed requests
        """
        self.settings = get_settings()
        self.hl = hl
        self.tz = tz
        self.retries = retries
        self._pytrends: Optional[TrendReq] = None
        self._last_request_time = 0.0
        self._min_request_interval = 60.0 / self.settings.pytrends_requests_per_minute

    @property
    def pytrends(self) -> TrendReq:
        """Lazy initialization of pytrends client."""
        if self._pytrends is None:
            self._pytrends = TrendReq(hl=self.hl, tz=self.tz, retries=self.retries)
        return self._pytrends

    def _rate_limit(self):
        """Ensure we don't exceed rate limits."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self._min_request_interval:
            sleep_time = self._min_request_interval - elapsed
            logger.debug(f"Rate limiting: sleeping {sleep_time:.2f}s")
            time.sleep(sleep_time)
        self._last_request_time = time.time()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        retry=retry_if_exception_type((Exception,)),
        before_sleep=lambda retry_state: logger.warning(
            f"Retrying after error: {retry_state.outcome.exception()}"
        ),
    )
    def _build_payload(self, keywords: list[str], timeframe: str, geo: str, cat: int = 0):
        """Build pytrends payload with rate limiting and retry."""
        self._rate_limit()
        self.pytrends.build_payload(
            kw_list=keywords[:5],  # Max 5 keywords per request
            timeframe=timeframe,
            geo=geo,
            cat=cat,
        )

    def fetch_trending(
        self,
        region: str = "US",
        category: int = 0,
        limit: int = 20,
    ) -> list[TrendData]:
        """Fetch currently trending searches from Google Trends.

        Args:
            region: Region code (e.g., 'US', 'GB')
            category: Category ID (0 = all)
            limit: Maximum results to return

        Returns:
            List of TrendData for trending searches
        """
        logger.info(f"Fetching trending searches for region={region}")
        results = []

        try:
            self._rate_limit()

            # Get trending searches (daily trends)
            geo = REGIONS.get(region, region)
            trending_df = self.pytrends.trending_searches(pn=geo.lower() if geo else "united_states")

            if trending_df is None or trending_df.empty:
                logger.warning(f"No trending searches found for {region}")
                return results

            # Convert to list of keywords
            keywords = trending_df[0].tolist()[:limit]

            # For each trending keyword, get basic data
            for i, keyword in enumerate(keywords):
                trend_data = TrendData(
                    keyword=keyword,
                    region=region,
                    source=self.source_code,
                    current_interest=100 - (i * 3),  # Approximate interest based on rank
                    baseline_interest=50,
                    metadata={"rank": i + 1, "source_type": "daily_trends"},
                )
                trend_data.trend_score = trend_data.calculate_trend_score()
                results.append(trend_data)

            logger.info(f"Found {len(results)} trending keywords for {region}")

        except Exception as e:
            logger.error(f"Error fetching trending searches: {e}")
            raise

        return results

    def fetch_realtime_trending(
        self,
        region: str = "US",
        category: str = "all",
        limit: int = 20,
    ) -> list[TrendData]:
        """Fetch realtime trending searches (stories) from Google Trends.

        Args:
            region: Region code
            category: Category name (e.g., 'all', 'business', 'entertainment')
            limit: Maximum results

        Returns:
            List of TrendData for realtime trending stories
        """
        logger.info(f"Fetching realtime trending for region={region}, category={category}")
        results = []

        try:
            self._rate_limit()

            geo = REGIONS.get(region, region)
            realtime_df = self.pytrends.realtime_trending_searches(
                pn=geo if geo else "US",
                cat=category,
                count=limit,
            )

            if realtime_df is None or realtime_df.empty:
                logger.warning(f"No realtime trends found for {region}")
                return results

            for idx, row in realtime_df.iterrows():
                if idx >= limit:
                    break

                title = row.get("title", row.get("entityNames", ["Unknown"])[0])
                trend_data = TrendData(
                    keyword=title,
                    region=region,
                    source=self.source_code,
                    metadata={
                        "source_type": "realtime_trends",
                        "articles": row.get("articles", []),
                    },
                )
                results.append(trend_data)

            logger.info(f"Found {len(results)} realtime trending topics for {region}")

        except Exception as e:
            logger.error(f"Error fetching realtime trending: {e}")
            # Realtime trends may not be available in all regions
            pass

        return results

    def fetch_interest_over_time(
        self,
        keywords: list[str],
        region: str = "US",
        timeframe: str = "7d",
    ) -> dict[str, TrendData]:
        """Fetch interest over time for specific keywords.

        Args:
            keywords: List of keywords (max 5)
            region: Region code
            timeframe: Time window ('1h', '4h', '24h', '7d', '30d', '90d')

        Returns:
            Dict mapping keyword to TrendData with timeseries
        """
        logger.info(f"Fetching interest over time for {len(keywords)} keywords, region={region}")

        tf = self.TIMEFRAMES.get(timeframe, timeframe)
        geo = REGIONS.get(region, region)
        results = {}

        try:
            # Build payload
            self._build_payload(keywords[:5], tf, geo)

            # Get interest over time
            self._rate_limit()
            iot_df = self.pytrends.interest_over_time()

            if iot_df is None or iot_df.empty:
                logger.warning("No interest over time data returned")
                return results

            # Process each keyword
            for keyword in keywords[:5]:
                if keyword not in iot_df.columns:
                    continue

                # Build timeseries
                timeseries = []
                for ts, row in iot_df.iterrows():
                    is_partial = row.get("isPartial", False) if "isPartial" in iot_df.columns else False
                    point = TimeseriesPoint(
                        timestamp=ts.to_pydatetime().replace(tzinfo=timezone.utc),
                        value=int(row[keyword]),
                        is_partial=bool(is_partial),
                    )
                    timeseries.append(point)

                # Create TrendData
                trend_data = TrendData(
                    keyword=keyword,
                    region=region,
                    source=self.source_code,
                    timeseries=timeseries,
                    metadata={"timeframe": timeframe},
                )
                trend_data.calculate_from_timeseries()
                results[keyword] = trend_data

            logger.info(f"Got timeseries data for {len(results)} keywords")

        except Exception as e:
            logger.error(f"Error fetching interest over time: {e}")
            raise

        return results

    def fetch_related_queries(
        self,
        keyword: str,
        region: str = "US",
        timeframe: str = "7d",
    ) -> tuple[list[str], list[dict]]:
        """Fetch related queries for a keyword.

        Args:
            keyword: The keyword to find related queries for
            region: Region code
            timeframe: Time window

        Returns:
            Tuple of (top_queries list, rising_queries list with values)
        """
        logger.info(f"Fetching related queries for '{keyword}', region={region}")

        tf = self.TIMEFRAMES.get(timeframe, timeframe)
        geo = REGIONS.get(region, region)
        top_queries = []
        rising_queries = []

        try:
            self._build_payload([keyword], tf, geo)
            self._rate_limit()

            related = self.pytrends.related_queries()

            if related and keyword in related:
                kw_data = related[keyword]

                # Top queries
                if kw_data.get("top") is not None and not kw_data["top"].empty:
                    top_df = kw_data["top"]
                    top_queries = top_df["query"].tolist()[:20]

                # Rising queries
                if kw_data.get("rising") is not None and not kw_data["rising"].empty:
                    rising_df = kw_data["rising"]
                    for _, row in rising_df.head(20).iterrows():
                        rising_queries.append({
                            "query": row["query"],
                            "value": row["value"],  # Can be int or "Breakout"
                        })

            logger.info(
                f"Found {len(top_queries)} top queries, {len(rising_queries)} rising queries"
            )

        except Exception as e:
            logger.error(f"Error fetching related queries: {e}")

        return top_queries, rising_queries

    def fetch_interest_by_region(
        self,
        keyword: str,
        region: str = "",  # Empty for worldwide
        resolution: str = "COUNTRY",
        timeframe: str = "7d",
    ) -> dict[str, int]:
        """Fetch interest by sub-region for a keyword.

        Args:
            keyword: The keyword to analyze
            region: Parent region (empty for global)
            resolution: 'COUNTRY', 'REGION', 'CITY', 'DMA'
            timeframe: Time window

        Returns:
            Dict mapping region code to interest value
        """
        logger.info(f"Fetching interest by region for '{keyword}'")

        tf = self.TIMEFRAMES.get(timeframe, timeframe)
        geo = REGIONS.get(region, region)
        results = {}

        try:
            self._build_payload([keyword], tf, geo)
            self._rate_limit()

            ibr_df = self.pytrends.interest_by_region(
                resolution=resolution,
                inc_low_vol=True,
                inc_geo_code=True,
            )

            if ibr_df is not None and not ibr_df.empty:
                for geo_name, row in ibr_df.iterrows():
                    if keyword in row:
                        results[geo_name] = int(row[keyword])

            logger.info(f"Got interest data for {len(results)} regions")

        except Exception as e:
            logger.error(f"Error fetching interest by region: {e}")

        return results

    def fetch_suggestions(self, keyword: str) -> list[dict]:
        """Get keyword suggestions from Google Trends.

        Args:
            keyword: Partial keyword to get suggestions for

        Returns:
            List of suggestion dicts with 'mid', 'title', 'type'
        """
        logger.debug(f"Fetching suggestions for '{keyword}'")

        try:
            self._rate_limit()
            suggestions = self.pytrends.suggestions(keyword)
            return suggestions or []
        except Exception as e:
            logger.error(f"Error fetching suggestions: {e}")
            return []
