"""Data fetchers for various trend sources."""

from .google_trends import GoogleTrendsFetcher
from .base import BaseFetcher, TrendData, TimeseriesPoint

__all__ = ["GoogleTrendsFetcher", "BaseFetcher", "TrendData", "TimeseriesPoint"]
