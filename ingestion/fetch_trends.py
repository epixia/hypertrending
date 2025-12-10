"""Fetch real Google Trends data and store in Supabase."""
import os
import time
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client
import pandas as pd

# Workaround for pytrends urllib3 compatibility issue
import urllib3.util.retry
if not hasattr(urllib3.util.retry.Retry, 'DEFAULT_ALLOWED_METHODS'):
    urllib3.util.retry.Retry.DEFAULT_ALLOWED_METHODS = frozenset(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE'])
    # Patch the old method_whitelist to allowed_methods
    original_init = urllib3.util.retry.Retry.__init__
    def patched_init(self, *args, **kwargs):
        if 'method_whitelist' in kwargs:
            kwargs['allowed_methods'] = kwargs.pop('method_whitelist')
        return original_init(self, *args, **kwargs)
    urllib3.util.retry.Retry.__init__ = patched_init

from pytrends.request import TrendReq

# Load env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def get_source_id(supabase, code="GOOGLE_TRENDS"):
    """Get source ID for Google Trends."""
    result = supabase.table("sources").select("id").eq("code", code).single().execute()
    return result.data["id"] if result.data else None

def upsert_keyword(supabase, keyword: str, language: str = "en"):
    """Insert or update keyword and return its ID."""
    normalized = keyword.lower().strip()

    # Try to find existing
    result = supabase.table("keywords").select("id").eq("normalized_keyword", normalized).eq("language", language).execute()

    if result.data and len(result.data) > 0:
        # Update last_seen_at
        kw_id = result.data[0]["id"]
        supabase.table("keywords").update({"last_seen_at": datetime.now(timezone.utc).isoformat()}).eq("id", kw_id).execute()
        return kw_id
    else:
        # Insert new
        insert_result = supabase.table("keywords").insert({
            "keyword": keyword,
            "language": language,
        }).execute()
        return insert_result.data[0]["id"] if insert_result.data else None

def store_timeseries(supabase, keyword_id: str, source_id: str, interest_data: list, region: str = "GLOBAL", granularity: str = "day"):
    """Store interest over time data."""
    records = []
    for point in interest_data:
        records.append({
            "keyword_id": keyword_id,
            "source_id": source_id,
            "region": region,
            "granularity": granularity,
            "ts": point["date"],
            "interest_value": min(100, max(0, int(point["value"]))),
            "is_partial": point.get("isPartial", False),
        })

    if records:
        # Upsert to avoid duplicates
        supabase.table("keyword_timeseries").upsert(records, on_conflict="keyword_id,source_id,region,granularity,ts").execute()

def fetch_and_store_trends(keywords: list, region: str = "US"):
    """Fetch Google Trends data for keywords and store in Supabase."""
    print(f"Initializing pytrends...")
    pytrends = TrendReq(hl='en-US', tz=360)

    print(f"Connecting to Supabase...")
    supabase = get_supabase()
    source_id = get_source_id(supabase)

    if not source_id:
        print("ERROR: Could not find GOOGLE_TRENDS source in database")
        return

    print(f"Source ID: {source_id}")

    results = []

    for i, keyword in enumerate(keywords):
        if i > 0:
            print(f"  Waiting 15s to avoid rate limit...")
            time.sleep(15)

        print(f"\n[{i+1}/{len(keywords)}] Fetching: {keyword}")

        try:
            # Build payload
            pytrends.build_payload([keyword], cat=0, timeframe='now 7-d', geo=region)

            # Get interest over time
            interest_df = pytrends.interest_over_time()

            if interest_df.empty:
                print(f"  No data for {keyword}")
                continue

            # Store keyword
            keyword_id = upsert_keyword(supabase, keyword)
            print(f"  Keyword ID: {keyword_id}")

            # Convert dataframe to records
            interest_data = []
            for idx, row in interest_df.iterrows():
                interest_data.append({
                    "date": idx.isoformat(),
                    "value": int(row[keyword]),
                    "isPartial": bool(row.get("isPartial", False))
                })

            # Store timeseries
            store_timeseries(supabase, keyword_id, source_id, interest_data, region=region, granularity="hour")

            # Calculate stats
            values = [p["value"] for p in interest_data]
            current = values[-1] if values else 0
            baseline = sum(values[:len(values)//2]) / max(1, len(values)//2) if values else 0
            trend_score = ((current - baseline) / max(1, baseline)) * 100 if baseline > 0 else current

            results.append({
                "keyword": keyword,
                "keyword_id": keyword_id,
                "current_interest": current,
                "baseline": round(baseline, 1),
                "trend_score": round(trend_score, 1),
                "data_points": len(interest_data),
            })

            print(f"  Current: {current}, Baseline: {baseline:.1f}, Trend: {trend_score:+.1f}%")
            print(f"  Stored {len(interest_data)} data points")

        except Exception as e:
            print(f"  ERROR: {e}")

    print("\n" + "="*50)
    print("RESULTS SUMMARY")
    print("="*50)

    for r in results:
        emoji = "🔥" if r["trend_score"] > 50 else "📈" if r["trend_score"] > 0 else "📉"
        print(f"{emoji} {r['keyword']}: {r['current_interest']} interest ({r['trend_score']:+.1f}%)")

    print(f"\nStored {len(results)} keywords with time series data in Supabase!")
    return results


if __name__ == "__main__":
    # Trending keywords to fetch (limited to 5 to avoid rate limiting)
    keywords = [
        "AI Agents",
        "ChatGPT",
        "Cursor IDE",
        "Claude AI",
        "DeepSeek",
    ]

    print("="*50)
    print("HYPERTRENDING - Google Trends Fetcher")
    print("="*50)

    fetch_and_store_trends(keywords, region="US")
