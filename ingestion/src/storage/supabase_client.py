"""Supabase storage client for persisting trend data."""

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from supabase import create_client, Client

from ..config import get_settings, SourceCode, TimeGranularity, TimeWindow
from ..fetchers.base import TrendData, TimeseriesPoint

logger = logging.getLogger(__name__)


class SupabaseStorage:
    """Storage client for Supabase database operations."""

    def __init__(self):
        """Initialize the Supabase client."""
        self.settings = get_settings()
        self._client: Optional[Client] = None
        self._source_cache: dict[str, str] = {}  # source_code -> source_id

    @property
    def client(self) -> Client:
        """Lazy initialization of Supabase client."""
        if self._client is None:
            self._client = create_client(
                self.settings.supabase_url,
                self.settings.supabase_key,
            )
        return self._client

    # -------------------------------------------------------------------------
    # Sources
    # -------------------------------------------------------------------------

    def get_source_id(self, source_code: str) -> Optional[str]:
        """Get source ID by code, with caching.

        Args:
            source_code: Source code (e.g., 'GOOGLE_TRENDS')

        Returns:
            Source UUID as string, or None if not found
        """
        if source_code in self._source_cache:
            return self._source_cache[source_code]

        try:
            result = (
                self.client.table("sources")
                .select("id")
                .eq("code", source_code)
                .single()
                .execute()
            )
            if result.data:
                source_id = result.data["id"]
                self._source_cache[source_code] = source_id
                return source_id
        except Exception as e:
            logger.error(f"Error fetching source ID for {source_code}: {e}")

        return None

    def get_all_sources(self) -> list[dict]:
        """Get all sources from database."""
        try:
            result = self.client.table("sources").select("*").execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching sources: {e}")
            return []

    # -------------------------------------------------------------------------
    # Keywords
    # -------------------------------------------------------------------------

    def upsert_keyword(
        self,
        keyword: str,
        language: str = "en",
        category: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Optional[str]:
        """Insert or update a keyword, returning its ID.

        Args:
            keyword: The keyword text
            language: Language code
            category: Optional category
            metadata: Optional metadata dict

        Returns:
            Keyword UUID as string, or None on error
        """
        normalized = keyword.lower().strip()

        try:
            # Try to find existing keyword
            result = (
                self.client.table("keywords")
                .select("id")
                .eq("normalized_keyword", normalized)
                .eq("language", language)
                .maybe_single()
                .execute()
            )

            if result.data:
                # Update existing
                keyword_id = result.data["id"]
                update_data = {"last_seen_at": datetime.now(timezone.utc).isoformat()}
                if category:
                    update_data["category"] = category
                if metadata:
                    update_data["metadata"] = metadata

                self.client.table("keywords").update(update_data).eq("id", keyword_id).execute()
                return keyword_id
            else:
                # Insert new
                insert_data = {
                    "keyword": keyword,
                    "language": language,
                }
                if category:
                    insert_data["category"] = category
                if metadata:
                    insert_data["metadata"] = metadata

                result = self.client.table("keywords").insert(insert_data).execute()
                if result.data:
                    return result.data[0]["id"]

        except Exception as e:
            logger.error(f"Error upserting keyword '{keyword}': {e}")

        return None

    def search_keywords(self, query: str, limit: int = 20) -> list[dict]:
        """Search keywords by text similarity.

        Args:
            query: Search query
            limit: Max results

        Returns:
            List of keyword records
        """
        try:
            # Use ilike for simple substring search
            result = (
                self.client.table("keywords")
                .select("*")
                .ilike("normalized_keyword", f"%{query.lower()}%")
                .limit(limit)
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.error(f"Error searching keywords: {e}")
            return []

    # -------------------------------------------------------------------------
    # Timeseries
    # -------------------------------------------------------------------------

    def insert_timeseries(
        self,
        keyword_id: str,
        source_id: str,
        region: str,
        granularity: str,
        points: list[TimeseriesPoint],
    ) -> int:
        """Insert timeseries data points.

        Args:
            keyword_id: Keyword UUID
            source_id: Source UUID
            region: Region code
            granularity: Time granularity ('hour', 'day', etc.)
            points: List of TimeseriesPoint objects

        Returns:
            Number of points inserted
        """
        if not points:
            return 0

        records = []
        for point in points:
            records.append({
                "keyword_id": keyword_id,
                "source_id": source_id,
                "region": region,
                "granularity": granularity,
                "ts": point.timestamp.isoformat(),
                "interest_value": point.value,
                "is_partial": point.is_partial,
                "metadata": point.metadata,
            })

        try:
            # Use upsert to handle duplicates
            result = (
                self.client.table("keyword_timeseries")
                .upsert(records, on_conflict="keyword_id,source_id,region,granularity,ts")
                .execute()
            )
            count = len(result.data) if result.data else 0
            logger.debug(f"Inserted {count} timeseries points for keyword {keyword_id}")
            return count

        except Exception as e:
            logger.error(f"Error inserting timeseries: {e}")
            return 0

    def get_timeseries(
        self,
        keyword_id: str,
        source_id: str,
        region: str = "US",
        granularity: str = "hour",
        from_ts: Optional[datetime] = None,
        to_ts: Optional[datetime] = None,
        limit: int = 1000,
    ) -> list[dict]:
        """Get timeseries data for a keyword.

        Args:
            keyword_id: Keyword UUID
            source_id: Source UUID
            region: Region code
            granularity: Time granularity
            from_ts: Start timestamp (optional)
            to_ts: End timestamp (optional)
            limit: Max points to return

        Returns:
            List of timeseries records
        """
        try:
            query = (
                self.client.table("keyword_timeseries")
                .select("*")
                .eq("keyword_id", keyword_id)
                .eq("source_id", source_id)
                .eq("region", region)
                .eq("granularity", granularity)
                .order("ts", desc=True)
                .limit(limit)
            )

            if from_ts:
                query = query.gte("ts", from_ts.isoformat())
            if to_ts:
                query = query.lte("ts", to_ts.isoformat())

            result = query.execute()
            return result.data or []

        except Exception as e:
            logger.error(f"Error fetching timeseries: {e}")
            return []

    # -------------------------------------------------------------------------
    # Missions
    # -------------------------------------------------------------------------

    def get_mission(self, mission_id: str) -> Optional[dict]:
        """Get a mission by ID."""
        try:
            result = (
                self.client.table("missions")
                .select("*")
                .eq("id", mission_id)
                .single()
                .execute()
            )
            return result.data
        except Exception as e:
            logger.error(f"Error fetching mission {mission_id}: {e}")
            return None

    def get_active_missions(self, workspace_id: Optional[str] = None) -> list[dict]:
        """Get all active missions, optionally filtered by workspace."""
        try:
            query = (
                self.client.table("missions")
                .select("*")
                .eq("status", "ACTIVE")
            )
            if workspace_id:
                query = query.eq("workspace_id", workspace_id)

            result = query.execute()
            return result.data or []

        except Exception as e:
            logger.error(f"Error fetching active missions: {e}")
            return []

    # -------------------------------------------------------------------------
    # Mission Runs
    # -------------------------------------------------------------------------

    def create_mission_run(
        self,
        mission_id: str,
        triggered_by: Optional[str] = None,
    ) -> Optional[str]:
        """Create a new mission run.

        Args:
            mission_id: Mission UUID
            triggered_by: User UUID who triggered the run (optional)

        Returns:
            Run UUID as string, or None on error
        """
        try:
            insert_data = {
                "mission_id": mission_id,
                "status": "PENDING",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
            if triggered_by:
                insert_data["triggered_by"] = triggered_by

            result = self.client.table("mission_runs").insert(insert_data).execute()
            if result.data:
                run_id = result.data[0]["id"]
                logger.info(f"Created mission run {run_id} for mission {mission_id}")
                return run_id

        except Exception as e:
            logger.error(f"Error creating mission run: {e}")

        return None

    def update_mission_run(
        self,
        run_id: str,
        status: str,
        keywords_scanned: int = 0,
        keywords_matched: int = 0,
        error_message: Optional[str] = None,
        stats: Optional[dict] = None,
    ):
        """Update a mission run's status and stats.

        Args:
            run_id: Run UUID
            status: New status ('RUNNING', 'COMPLETED', 'FAILED')
            keywords_scanned: Number of keywords scanned
            keywords_matched: Number of keywords that matched criteria
            error_message: Error message if failed
            stats: Additional stats dict
        """
        try:
            update_data = {
                "status": status,
                "keywords_scanned": keywords_scanned,
                "keywords_matched": keywords_matched,
            }

            if status in ("COMPLETED", "FAILED"):
                update_data["completed_at"] = datetime.now(timezone.utc).isoformat()

            if error_message:
                update_data["error_message"] = error_message

            if stats:
                update_data["stats"] = stats

            self.client.table("mission_runs").update(update_data).eq("id", run_id).execute()
            logger.info(f"Updated mission run {run_id} to status {status}")

        except Exception as e:
            logger.error(f"Error updating mission run {run_id}: {e}")

    def get_latest_run(self, mission_id: str) -> Optional[dict]:
        """Get the latest run for a mission."""
        try:
            result = (
                self.client.table("mission_runs")
                .select("*")
                .eq("mission_id", mission_id)
                .order("created_at", desc=True)
                .limit(1)
                .maybe_single()
                .execute()
            )
            return result.data
        except Exception as e:
            logger.error(f"Error fetching latest run: {e}")
            return None

    # -------------------------------------------------------------------------
    # Mission Results
    # -------------------------------------------------------------------------

    def insert_mission_results(self, results: list[dict]) -> int:
        """Insert mission results in bulk.

        Args:
            results: List of result dicts with fields:
                - mission_run_id
                - keyword_id
                - source_id
                - region
                - time_window
                - current_interest
                - baseline_interest
                - trend_score
                - rank_position
                - (optional) volume_score, velocity_score, related_keywords, metrics

        Returns:
            Number of results inserted
        """
        if not results:
            return 0

        try:
            result = self.client.table("mission_results").insert(results).execute()
            count = len(result.data) if result.data else 0
            logger.info(f"Inserted {count} mission results")
            return count

        except Exception as e:
            logger.error(f"Error inserting mission results: {e}")
            return 0

    def get_mission_results(
        self,
        run_id: str,
        region: Optional[str] = None,
        time_window: Optional[str] = None,
        limit: int = 100,
    ) -> list[dict]:
        """Get results for a mission run.

        Args:
            run_id: Mission run UUID
            region: Optional region filter
            time_window: Optional time window filter
            limit: Max results

        Returns:
            List of result records with keyword data
        """
        try:
            query = (
                self.client.table("mission_results")
                .select("*, keywords(keyword, category)")
                .eq("mission_run_id", run_id)
                .order("rank_position")
                .limit(limit)
            )

            if region:
                query = query.eq("region", region)
            if time_window:
                query = query.eq("time_window", time_window)

            result = query.execute()
            return result.data or []

        except Exception as e:
            logger.error(f"Error fetching mission results: {e}")
            return []

    # -------------------------------------------------------------------------
    # Batch Operations
    # -------------------------------------------------------------------------

    def store_trend_data(
        self,
        trend_data: TrendData,
        granularity: str = "hour",
    ) -> Optional[str]:
        """Store complete trend data (keyword + timeseries).

        Args:
            trend_data: TrendData object with keyword and timeseries
            granularity: Time granularity for timeseries

        Returns:
            Keyword ID on success, None on error
        """
        # Get source ID
        source_id = self.get_source_id(trend_data.source)
        if not source_id:
            logger.error(f"Source not found: {trend_data.source}")
            return None

        # Upsert keyword
        keyword_id = self.upsert_keyword(
            keyword=trend_data.keyword,
            metadata=trend_data.metadata,
        )
        if not keyword_id:
            return None

        # Insert timeseries if present
        if trend_data.timeseries:
            self.insert_timeseries(
                keyword_id=keyword_id,
                source_id=source_id,
                region=trend_data.region,
                granularity=granularity,
                points=trend_data.timeseries,
            )

        return keyword_id

    def store_mission_run_results(
        self,
        run_id: str,
        trend_data_list: list[TrendData],
        time_window: str = "24h",
    ) -> int:
        """Store results from a mission run.

        Args:
            run_id: Mission run UUID
            trend_data_list: List of TrendData objects
            time_window: Time window for analysis

        Returns:
            Number of results stored
        """
        results = []

        for rank, trend_data in enumerate(trend_data_list, start=1):
            # Store keyword and timeseries
            keyword_id = self.store_trend_data(trend_data)
            if not keyword_id:
                continue

            # Get source ID
            source_id = self.get_source_id(trend_data.source)
            if not source_id:
                continue

            # Build result record
            result = {
                "mission_run_id": run_id,
                "keyword_id": keyword_id,
                "source_id": source_id,
                "region": trend_data.region,
                "time_window": time_window,
                "current_interest": trend_data.current_interest,
                "baseline_interest": trend_data.baseline_interest,
                "trend_score": trend_data.trend_score,
                "rank_position": rank,
                "related_keywords": trend_data.related_queries[:10] if trend_data.related_queries else None,
                "metrics": {
                    "rising_queries": trend_data.rising_queries[:5] if trend_data.rising_queries else [],
                },
            }
            results.append(result)

        return self.insert_mission_results(results)
