"""FastAPI backend for live trend refresh and market management."""
import os
import json
from datetime import datetime, timezone
from typing import Optional, List
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

# Workaround for pytrends urllib3 compatibility issue
import urllib3.util.retry
if not hasattr(urllib3.util.retry.Retry, 'DEFAULT_ALLOWED_METHODS'):
    urllib3.util.retry.Retry.DEFAULT_ALLOWED_METHODS = frozenset(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE'])
    original_init = urllib3.util.retry.Retry.__init__
    def patched_init(self, *args, **kwargs):
        if 'method_whitelist' in kwargs:
            kwargs['allowed_methods'] = kwargs.pop('method_whitelist')
        return original_init(self, *args, **kwargs)
    urllib3.util.retry.Retry.__init__ = patched_init

from pytrends.request import TrendReq
from supabase import create_client

load_dotenv()

app = FastAPI(title="HyperTrending API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8888", "http://localhost:8891", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def get_openai():
    if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-api-key-here":
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    return OpenAI(api_key=OPENAI_API_KEY)

def get_source_id(supabase, code="GOOGLE_TRENDS"):
    result = supabase.table("sources").select("id").eq("code", code).single().execute()
    return result.data["id"] if result.data else None

class RefreshResponse(BaseModel):
    keyword: str
    keyword_id: str
    current_interest: int
    trend_score: float
    data_points: int
    sparkline: list[int]
    last_updated: str

class RefreshRequest(BaseModel):
    keyword: str
    region: str = "US"

@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.post("/api/refresh-trend", response_model=RefreshResponse)
def refresh_trend(request: RefreshRequest):
    """Fetch fresh Google Trends data for a single keyword."""
    keyword = request.keyword
    region = request.region

    try:
        print(f"Refreshing trend for: {keyword}")
        pytrends = TrendReq(hl='en-US', tz=360)
        supabase = get_supabase()
        source_id = get_source_id(supabase)

        if not source_id:
            raise HTTPException(status_code=500, detail="Could not find GOOGLE_TRENDS source")

        # Build payload and fetch data
        pytrends.build_payload([keyword], cat=0, timeframe='now 7-d', geo=region)
        interest_df = pytrends.interest_over_time()

        if interest_df.empty:
            raise HTTPException(status_code=404, detail=f"No data available for {keyword}")

        # Get or create keyword
        normalized = keyword.lower().strip()
        result = supabase.table("keywords").select("id").eq("normalized_keyword", normalized).execute()

        if result.data and len(result.data) > 0:
            keyword_id = result.data[0]["id"]
            supabase.table("keywords").update({
                "last_seen_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", keyword_id).execute()
        else:
            insert_result = supabase.table("keywords").insert({
                "keyword": keyword,
                "language": "en",
            }).execute()
            keyword_id = insert_result.data[0]["id"]

        # Convert dataframe to records
        interest_data = []
        for idx, row in interest_df.iterrows():
            interest_data.append({
                "date": idx.isoformat(),
                "value": int(row[keyword]),
                "isPartial": bool(row.get("isPartial", False))
            })

        # Store timeseries
        records = []
        for point in interest_data:
            records.append({
                "keyword_id": keyword_id,
                "source_id": source_id,
                "region": region,
                "granularity": "hour",
                "ts": point["date"],
                "interest_value": min(100, max(0, int(point["value"]))),
                "is_partial": point.get("isPartial", False),
            })

        if records:
            supabase.table("keyword_timeseries").upsert(
                records,
                on_conflict="keyword_id,source_id,region,granularity,ts"
            ).execute()

        # Calculate stats
        values = [p["value"] for p in interest_data]
        current = values[-1] if values else 0
        baseline = sum(values[:len(values)//2]) / max(1, len(values)//2) if values else 0
        trend_score = ((current - baseline) / max(1, baseline)) * 100 if baseline > 0 else current

        # Return all values for sparkline to show full 7-day trend
        sparkline = values

        return RefreshResponse(
            keyword=keyword,
            keyword_id=keyword_id,
            current_interest=current,
            trend_score=round(trend_score, 1),
            data_points=len(interest_data),
            sparkline=sparkline,
            last_updated=datetime.now(timezone.utc).isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error refreshing {keyword}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trends")
def get_all_trends():
    """Get all tracked trends with their latest data."""
    supabase = get_supabase()

    # Fetch keywords
    keywords_result = supabase.table("keywords").select("id, keyword, last_seen_at").order("last_seen_at", desc=True).execute()

    trends = []
    for kw in keywords_result.data or []:
        # Get timeseries
        ts_result = supabase.table("keyword_timeseries").select("ts, interest_value").eq("keyword_id", kw["id"]).order("ts").execute()

        if ts_result.data and len(ts_result.data) > 0:
            values = [d["interest_value"] for d in ts_result.data]
            current = values[-1]
            baseline = sum(values[:len(values)//2]) / max(1, len(values)//2)
            trend_score = ((current - baseline) / max(1, baseline)) * 100 if baseline > 0 else current

            trends.append({
                "keyword": kw["keyword"],
                "keyword_id": kw["id"],
                "current_interest": current,
                "trend_score": round(trend_score, 1),
                "sparkline": values,  # Full 7-day data
                "last_updated": kw["last_seen_at"],
                "data_points": len(values)
            })

    # Sort by trend score
    trends.sort(key=lambda x: x["trend_score"], reverse=True)

    return {"trends": trends, "count": len(trends)}


# ============== MARKETS CRUD ==============

class MarketCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class MarketUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

class GenerateNichesRequest(BaseModel):
    parent_name: str
    parent_id: Optional[str] = None
    count: int = 5
    context: Optional[str] = None  # Additional context about the niche

class GenerateMarketsRequest(BaseModel):
    count: int = 3
    exclude: List[str] = []  # Existing market names to exclude

@app.get("/api/markets")
def get_markets():
    """Get all markets as a flat list."""
    supabase = get_supabase()
    result = supabase.table("markets").select("*").order("sort_order").execute()
    return {"markets": result.data or [], "count": len(result.data or [])}

@app.get("/api/markets/tree")
def get_markets_tree():
    """Get all markets as a hierarchical tree."""
    supabase = get_supabase()
    result = supabase.table("markets").select("*").eq("is_active", True).order("sort_order").execute()

    markets = result.data or []

    # Build tree structure
    market_map = {m["id"]: {**m, "children": []} for m in markets}
    roots = []

    for market in markets:
        if market["parent_id"] is None:
            roots.append(market_map[market["id"]])
        elif market["parent_id"] in market_map:
            market_map[market["parent_id"]]["children"].append(market_map[market["id"]])

    return {"markets": roots, "total": len(markets)}

@app.post("/api/markets")
def create_market(market: MarketCreate):
    """Create a new market."""
    supabase = get_supabase()

    # Generate slug from name
    slug = market.name.lower().replace(" ", "-").replace("&", "and")
    slug = "".join(c for c in slug if c.isalnum() or c == "-")

    # Get max sort_order for siblings
    if market.parent_id:
        siblings = supabase.table("markets").select("sort_order").eq("parent_id", market.parent_id).execute()
    else:
        siblings = supabase.table("markets").select("sort_order").is_("parent_id", "null").execute()

    max_order = max([s["sort_order"] for s in (siblings.data or [])], default=-1)

    data = {
        "name": market.name,
        "slug": slug,
        "parent_id": market.parent_id,
        "description": market.description,
        "icon": market.icon,
        "color": market.color,
        "sort_order": max_order + 1,
    }

    result = supabase.table("markets").insert(data).execute()
    return {"market": result.data[0] if result.data else None}

@app.put("/api/markets/{market_id}")
def update_market(market_id: str, market: MarketUpdate):
    """Update an existing market."""
    supabase = get_supabase()

    data = {k: v for k, v in market.model_dump().items() if v is not None}
    data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = supabase.table("markets").update(data).eq("id", market_id).execute()
    return {"market": result.data[0] if result.data else None}

@app.delete("/api/markets/{market_id}")
def delete_market(market_id: str):
    """Delete a market and all its children (cascade)."""
    supabase = get_supabase()

    # The database cascade will handle children
    supabase.table("markets").delete().eq("id", market_id).execute()
    return {"success": True, "deleted_id": market_id}

@app.post("/api/markets/bulk")
def create_markets_bulk(markets: List[MarketCreate]):
    """Create multiple markets at once."""
    supabase = get_supabase()
    results = []

    for market in markets:
        slug = market.name.lower().replace(" ", "-").replace("&", "and")
        slug = "".join(c for c in slug if c.isalnum() or c == "-")

        data = {
            "name": market.name,
            "slug": slug,
            "parent_id": market.parent_id,
            "description": market.description,
            "icon": market.icon,
            "color": market.color,
        }

        result = supabase.table("markets").insert(data).execute()
        if result.data:
            results.append(result.data[0])

    return {"markets": results, "count": len(results)}


# ============== AI GENERATION ==============

@app.post("/api/ai/generate-niches")
def generate_niches(request: GenerateNichesRequest):
    """Generate sub-niche ideas using OpenAI."""
    client = get_openai()

    context_str = f"\nAdditional context: {request.context}" if request.context else ""

    prompt = f"""You are an expert market researcher specializing in identifying profitable niches for online businesses.

Given the parent niche/market: "{request.parent_name}"{context_str}

Generate exactly {request.count} specific sub-niches that would be good for:
- Online courses and coaching
- Digital products
- Content creation
- Affiliate marketing

Requirements:
- Each niche should be specific enough to target (not too broad)
- Each should have a clear audience
- Focus on niches with commercial intent
- Include a mix of trending and evergreen topics

Return ONLY a JSON array of objects with this structure:
[
  {{"name": "Niche Name", "description": "Brief description of the niche and why it's valuable"}}
]

Do not include any other text, just the JSON array."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=1000,
        )

        content = response.choices[0].message.content.strip()
        # Clean up markdown code blocks if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        niches = json.loads(content)

        return {
            "niches": niches,
            "parent_name": request.parent_name,
            "parent_id": request.parent_id,
        }
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

@app.post("/api/ai/generate-markets")
def generate_markets(request: GenerateMarketsRequest):
    """Generate new top-level market ideas using OpenAI."""
    client = get_openai()

    exclude_str = f"\n\nDo NOT include these existing markets: {', '.join(request.exclude)}" if request.exclude else ""

    prompt = f"""You are an expert market researcher specializing in identifying profitable market categories for online businesses.

Generate exactly {request.count} new top-level market categories that would be excellent for:
- Online courses and coaching
- Digital products
- Content creation
- Affiliate marketing
- SaaS products

The markets should be:
- Broad enough to have many sub-niches
- Have strong commercial potential
- Be distinct from each other
- Have passionate audiences willing to spend money{exclude_str}

Return ONLY a JSON array of objects with this structure:
[
  {{"name": "Market Name", "description": "Brief description of the market opportunity", "example_niches": ["Niche 1", "Niche 2", "Niche 3"]}}
]

Do not include any other text, just the JSON array."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.9,
            max_tokens=1000,
        )

        content = response.choices[0].message.content.strip()
        # Clean up markdown code blocks if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        markets = json.loads(content)

        return {"markets": markets}
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@app.post("/api/markets/seed")
def seed_markets():
    """Seed the markets table with initial data from the static JSON."""
    supabase = get_supabase()

    # Check if already seeded
    existing = supabase.table("markets").select("id").limit(1).execute()
    if existing.data:
        return {"message": "Markets already seeded", "count": 0}

    MARKET_DATA = {
        "name": "The 3 Core Markets",
        "children": [
            {
                "name": "Health",
                "children": [
                    {"name": "Fitness", "children": [
                        {"name": "Weight Loss", "children": [
                            {"name": "Weight Loss for Busy Professionals"},
                            {"name": "Weight Loss for Postpartum Moms"},
                            {"name": "Weight Loss for Men Over 40"}
                        ]},
                        {"name": "Muscle Building", "children": [
                            {"name": "Body Recomposition for Beginners"},
                            {"name": "Strength Training for Women"},
                            {"name": "Muscle Programs for Hard-Gainers"}
                        ]},
                        {"name": "Flexibility & Mobility", "children": [
                            {"name": "Mobility for Office Workers"},
                            {"name": "Mobility for Seniors"},
                            {"name": "Mobility for Athletes"}
                        ]},
                        {"name": "Home Workouts", "children": [
                            {"name": "No-Equipment Workouts"},
                            {"name": "HIIT at Home"},
                            {"name": "Low-Impact Workouts for Joint Pain"}
                        ]}
                    ]},
                    {"name": "Nutrition", "children": [
                        {"name": "Diet Plans", "children": [
                            {"name": "Keto Diet"},
                            {"name": "Plant-Based Nutrition"},
                            {"name": "Intermittent Fasting"}
                        ]},
                        {"name": "Specialized Diets", "children": [
                            {"name": "Keto for Diabetics"},
                            {"name": "Plant-Based for Bodybuilders"},
                            {"name": "Family Meal Planning"}
                        ]},
                        {"name": "Supplements", "children": [
                            {"name": "Pre-Workout for Beginners"},
                            {"name": "Endurance Supplements"},
                            {"name": "Supplements for Men's Health"},
                            {"name": "Supplements for Hormonal Balance in Women"}
                        ]}
                    ]},
                    {"name": "Mental Health", "children": [
                        {"name": "Stress Management", "children": [
                            {"name": "Meditation for Corporate Professionals"},
                            {"name": "Meditation for Sleep Improvement"},
                            {"name": "Stress Relief for Parents"},
                            {"name": "Stress Coaching for College Students"}
                        ]},
                        {"name": "Therapy & Counseling", "children": [
                            {"name": "Online Therapy"},
                            {"name": "Online Therapy for Veterans"},
                            {"name": "Online Therapy for Social Anxiety"}
                        ]},
                        {"name": "Cognitive Behavioral Therapy (CBT)", "children": [
                            {"name": "CBT for Adolescents"},
                            {"name": "CBT for OCD"},
                            {"name": "CBT for Panic Disorders"}
                        ]},
                        {"name": "Mindfulness", "children": [
                            {"name": "Guided Mindfulness for Productivity"},
                            {"name": "Mindfulness for Anxiety"},
                            {"name": "Mindfulness for Kids"}
                        ]}
                    ]},
                    {"name": "Preventative Health", "children": [
                        {"name": "Immunity Boosting", "children": [
                            {"name": "Immunity Programs for Children"},
                            {"name": "Immunity Boosting for Travelers"}
                        ]},
                        {"name": "Longevity & Anti-Aging", "children": [
                            {"name": "Anti-Aging for Women Over 50"},
                            {"name": "Longevity Coaching for Executives"}
                        ]},
                        {"name": "Sleep Health", "children": [
                            {"name": "Sleep Optimization for Athletes"},
                            {"name": "Sleep Coaching for Entrepreneurs"},
                            {"name": "Insomnia Programs"}
                        ]}
                    ]},
                    {"name": "Alternative Medicine", "children": [
                        {"name": "Herbal Medicine", "children": [
                            {"name": "Herbal Remedies for Skin Conditions"},
                            {"name": "Herbal Treatments for Digestive Issues"}
                        ]},
                        {"name": "Acupuncture", "children": [
                            {"name": "Acupuncture for Pain Relief"},
                            {"name": "Acupuncture for Fertility"}
                        ]},
                        {"name": "Aromatherapy", "children": [
                            {"name": "Aromatherapy for Anxiety"},
                            {"name": "Aromatherapy for Insomnia"}
                        ]}
                    ]}
                ]
            },
            {
                "name": "Wealth",
                "children": [
                    {"name": "Making Money", "children": [
                        {"name": "Online Business", "children": [
                            {"name": "Start a SaaS"},
                            {"name": "Coaching Business Startup"},
                            {"name": "Info-Product Creation"}
                        ]},
                        {"name": "Trading & Investing", "children": [
                            {"name": "Options Trading for Beginners"},
                            {"name": "Crypto Auto-Trading Bots"},
                            {"name": "Algo-Trading for Busy Professionals"}
                        ]},
                        {"name": "Freelancing", "children": [
                            {"name": "Freelancing for Developers"},
                            {"name": "High-Ticket Copywriting"},
                            {"name": "Design Services for Startups"}
                        ]}
                    ]},
                    {"name": "Career & Skills", "children": [
                        {"name": "Career Growth", "children": [
                            {"name": "Career Switching Coaching"},
                            {"name": "Salary Negotiation Coaching"},
                            {"name": "Leadership Development"}
                        ]},
                        {"name": "Skill Development", "children": [
                            {"name": "Learn Coding"},
                            {"name": "Learn AI Skills"},
                            {"name": "Data Analytics for Beginners"}
                        ]},
                        {"name": "Productivity", "children": [
                            {"name": "Deep Work Training"},
                            {"name": "Focus & Attention Coaching"},
                            {"name": "Time Management Systems"}
                        ]}
                    ]},
                    {"name": "Personal Finance", "children": [
                        {"name": "Budgeting", "children": [
                            {"name": "Zero-Based Budgeting"},
                            {"name": "Budgeting for Families"},
                            {"name": "Debt Elimination Plans"}
                        ]},
                        {"name": "Saving & Investing", "children": [
                            {"name": "ETF Investing"},
                            {"name": "Real Estate Investing"},
                            {"name": "Investing for Beginners"}
                        ]},
                        {"name": "Financial Planning", "children": [
                            {"name": "Retirement Planning"},
                            {"name": "Tax Optimization for Entrepreneurs"},
                            {"name": "Wealth Protection Strategies"}
                        ]}
                    ]},
                    {"name": "Entrepreneurship", "children": [
                        {"name": "Startups", "children": [
                            {"name": "Subscription Business Models"},
                            {"name": "SMMA Launch"},
                            {"name": "Scaling a Coaching Business"}
                        ]},
                        {"name": "eCommerce", "children": [
                            {"name": "Dropshipping Stores"},
                            {"name": "Print-on-Demand Products"},
                            {"name": "Amazon FBA Launch"}
                        ]},
                        {"name": "Side Hustles", "children": [
                            {"name": "Etsy Digital Products"},
                            {"name": "Flipping Items"},
                            {"name": "Micro-Service Agencies"}
                        ]}
                    ]}
                ]
            },
            {
                "name": "Relationships",
                "children": [
                    {"name": "Dating", "children": [
                        {"name": "Dating for Men", "children": [
                            {"name": "Confidence Coaching"},
                            {"name": "Online Dating Profile Optimization"},
                            {"name": "Messaging Strategy Coaching"}
                        ]},
                        {"name": "Dating for Women", "children": [
                            {"name": "Attracting High-Value Partners"},
                            {"name": "Feminine Energy Coaching"},
                            {"name": "Online Dating for Women"}
                        ]},
                        {"name": "Dating Strategy", "children": [
                            {"name": "Red Flag Identification"},
                            {"name": "Compatibility Analysis"},
                            {"name": "First-Date Coaching"}
                        ]}
                    ]},
                    {"name": "Marriage & Relationships", "children": [
                        {"name": "Marriage Coaching", "children": [
                            {"name": "Communication Frameworks"},
                            {"name": "Building Intimacy"},
                            {"name": "Resolving Long-Term Conflicts"}
                        ]},
                        {"name": "Relationship Repair", "children": [
                            {"name": "Post-Infidelity Recovery"},
                            {"name": "Trust-Building"},
                            {"name": "Emotional Healing"}
                        ]},
                        {"name": "Couples Growth", "children": [
                            {"name": "Couples Goal Setting"},
                            {"name": "Emotional Intelligence for Couples"},
                            {"name": "Rekindling Romance"}
                        ]}
                    ]},
                    {"name": "Parenting", "children": [
                        {"name": "Parenting Skills", "children": [
                            {"name": "Parenting Toddlers"},
                            {"name": "Parenting Teens"},
                            {"name": "Setting Boundaries"}
                        ]},
                        {"name": "Behavioral Support", "children": [
                            {"name": "ADHD Parenting Coaching"},
                            {"name": "Autism Spectrum Parenting"}
                        ]},
                        {"name": "Family Dynamics", "children": [
                            {"name": "Blended Family Coaching"},
                            {"name": "Co-Parenting Systems"}
                        ]}
                    ]},
                    {"name": "Social Skills", "children": [
                        {"name": "Networking", "children": [
                            {"name": "Networking for Professionals"},
                            {"name": "Making Friends as an Adult"},
                            {"name": "Social Circle Building"}
                        ]},
                        {"name": "Confidence", "children": [
                            {"name": "Social Anxiety Coaching"},
                            {"name": "Public Speaking"},
                            {"name": "Charisma Development"}
                        ]}
                    ]}
                ]
            }
        ]
    }

    def insert_node(node, parent_id=None, sort_order=0):
        slug = node["name"].lower().replace(" ", "-").replace("&", "and")
        slug = "".join(c for c in slug if c.isalnum() or c == "-")

        data = {
            "name": node["name"],
            "slug": slug,
            "parent_id": parent_id,
            "sort_order": sort_order,
        }

        result = supabase.table("markets").insert(data).execute()
        node_id = result.data[0]["id"] if result.data else None

        count = 1
        if node.get("children") and node_id:
            for i, child in enumerate(node["children"]):
                count += insert_node(child, node_id, i)

        return count

    total = 0
    for i, child in enumerate(MARKET_DATA["children"]):
        total += insert_node(child, None, i)

    return {"message": "Markets seeded successfully", "count": total}


# ============== SAAS CRUD ==============

class SaasCreate(BaseModel):
    name: str
    description: Optional[str] = None
    mrr: Optional[int] = None
    website_url: Optional[str] = None
    founder_name: Optional[str] = None
    category: Optional[str] = None
    youtube_video_id: Optional[str] = None

class SaasUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    mrr: Optional[int] = None
    website_url: Optional[str] = None
    founder_name: Optional[str] = None
    category: Optional[str] = None
    youtube_video_id: Optional[str] = None
    youtube_transcript: Optional[str] = None

class FetchTranscriptRequest(BaseModel):
    youtube_video_id: str

class ChannelImportRequest(BaseModel):
    channel_url: str  # YouTube channel URL (e.g., https://www.youtube.com/@starterstory)
    limit: int = 100  # Max videos to fetch
    analyze: bool = True  # Whether to analyze transcripts with AI

@app.post("/api/saas/reanalyze-all")
def reanalyze_all_saas():
    """Re-analyze all SaaS apps that have null MRR, extracting from titles."""
    import re

    supabase = get_supabase()
    openai_client = get_openai()

    # Get all apps with null MRR
    result = supabase.table("saas_apps").select("*").is_("mrr", "null").execute()
    apps = result.data or []

    updated = []
    failed = []

    for app in apps:
        title = app.get("youtube_title") or app.get("name") or ""
        app_id = app.get("id")
        slug = app.get("slug")

        if not title or not app_id:
            continue

        try:
            # First try regex extraction from title
            mrr_from_title = None
            title_lower = title.lower()

            mrr_patterns = [
                r'\$(\d+(?:,\d+)?)\s*k\s*/\s*(?:month|mo)\b',   # $30K/month
                r'\$(\d+(?:,\d+)?(?:\.\d+)?)\s*m\s*/\s*(?:month|mo)\b',  # $1M/month
                r'(\d+(?:,\d+)?)\s*k\s*/\s*(?:month|mo)\b',     # 30K/month without $
                r'\$(\d+(?:,\d+)?)\s*k\s*(?:mrr|arr)\b',        # $100K MRR
                r'(\d+(?:,\d+)?)\s*k\s*(?:mrr|arr)\b',          # 100K MRR without $
                r'\$(\d+(?:,\d+)?(?:\.\d+)?)\s*m\s*(?:mrr|arr)\b',  # $1M MRR
                r'makes?\s*\$(\d+(?:,\d+)?)\s*k\s*/\s*(?:year|yr)\b',  # makes $120K/year
            ]

            for pattern in mrr_patterns:
                match = re.search(pattern, title_lower)
                if match:
                    value_str = match.group(1).replace(',', '')
                    value = float(value_str)
                    if 'm' in pattern:
                        mrr_from_title = int(value * 1000000)
                    elif 'k' in pattern.lower() or value < 1000:
                        mrr_from_title = int(value * 1000)
                    else:
                        mrr_from_title = int(value)
                    if 'year' in pattern or 'yr' in pattern:
                        mrr_from_title = mrr_from_title // 12
                    break

            # Also use AI to extract more info
            prompt = f"""Analyze this YouTube video title about a SaaS/software business. Extract:

1. Business/Product name (if mentioned in title like "Subscribr", "Letterly", "Gravl", etc.)
2. Monthly Recurring Revenue (MRR) in dollars. Parse: "$30K/month" = 30000, "$100K MRR" = 100000, "$250K per month" = 250000, "$1M/month" = 1000000
3. Category (Mobile App, SaaS, Web App, etc.)

Return JSON: {{"name": "string or null", "mrr": number or null, "category": "string or null"}}

Title: {title}
"""
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Extract business info from video titles. Return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )

            extracted = json.loads(response.choices[0].message.content)

            # Build update data
            update_data = {}
            if extracted.get("mrr"):
                update_data["mrr"] = extracted["mrr"]
            elif mrr_from_title:
                update_data["mrr"] = mrr_from_title

            if extracted.get("name") and extracted["name"] != title:
                update_data["name"] = extracted["name"]

            if extracted.get("category"):
                update_data["category"] = extracted["category"]

            if update_data:
                supabase.table("saas_apps").update(update_data).eq("id", app_id).execute()
                updated.append({
                    "slug": slug,
                    "title": title,
                    "updates": update_data
                })

        except Exception as e:
            failed.append({
                "slug": slug,
                "title": title,
                "error": str(e)
            })

    return {
        "message": "Re-analysis complete",
        "updated": len(updated),
        "failed": len(failed),
        "details": {
            "updated": updated,
            "failed": failed
        }
    }


@app.post("/api/saas/extract-niches")
def extract_niches_from_transcripts():
    """Extract niche information from transcripts for all apps missing niche."""
    supabase = get_supabase()
    openai_client = get_openai()

    # Get all apps that have transcripts but no niche
    result = supabase.table("saas_apps").select("id, slug, name, youtube_title, youtube_transcript, description").is_("niche", "null").not_.is_("youtube_transcript", "null").execute()
    apps = result.data or []

    updated = []
    failed = []

    for app in apps:
        transcript = app.get("youtube_transcript", "")
        title = app.get("youtube_title") or app.get("name") or ""
        description = app.get("description") or ""
        app_id = app.get("id")
        slug = app.get("slug")

        if not transcript or not app_id:
            continue

        try:
            # Use first 4000 chars of transcript to save tokens
            prompt = f"""Analyze this YouTube video about a SaaS business and determine what specific market/industry niche they serve.

Title: {title}
Description: {description}

Transcript excerpt:
{transcript[:4000]}

What is the specific NICHE or target market for this business? Examples of niches:
- "Real Estate Agents"
- "E-commerce Stores"
- "Restaurants"
- "Fitness Coaches"
- "Dentists"
- "Law Firms"
- "YouTubers"
- "Small Businesses"
- "Developers"
- "Marketers"
- "Freelancers"

Return JSON: {{"niche": "string - the specific industry/market served, or null if general-purpose"}}
"""
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Extract the target niche/market from business descriptions. Return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )

            extracted = json.loads(response.choices[0].message.content)

            if extracted.get("niche"):
                supabase.table("saas_apps").update({"niche": extracted["niche"]}).eq("id", app_id).execute()
                updated.append({
                    "slug": slug,
                    "name": app.get("name"),
                    "niche": extracted["niche"]
                })

        except Exception as e:
            failed.append({
                "slug": slug,
                "error": str(e)
            })

    return {
        "message": "Niche extraction complete",
        "updated": len(updated),
        "failed": len(failed),
        "details": {
            "updated": updated,
            "failed": failed
        }
    }


@app.post("/api/saas/init-table")
def init_saas_table():
    """Initialize the saas_apps table if it doesn't exist."""
    supabase = get_supabase()

    # Create table SQL
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS saas_apps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        mrr INTEGER,
        arr INTEGER,
        revenue_verified BOOLEAN DEFAULT FALSE,
        revenue_date TIMESTAMPTZ,
        website_url TEXT,
        founder_name VARCHAR(255),
        founder_twitter VARCHAR(255),
        founded_date DATE,
        employee_count INTEGER,
        category VARCHAR(100),
        youtube_video_id VARCHAR(20),
        youtube_title TEXT,
        youtube_description TEXT,
        youtube_transcript TEXT,
        youtube_published_at TIMESTAMPTZ,
        tech_stack TEXT[],
        business_model VARCHAR(100),
        target_market TEXT,
        key_metrics JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
    );
    """

    # For Supabase, we need to use the REST API or direct connection
    # Since we only have anon key, let's try a different approach
    # We'll check if table exists by trying to query it
    try:
        result = supabase.table("saas_apps").select("id").limit(1).execute()
        return {"message": "Table already exists", "status": "ok"}
    except Exception as e:
        error_msg = str(e)
        if "PGRST205" in error_msg or "saas_apps" in error_msg:
            # Table doesn't exist - need to create it via Supabase Dashboard
            return {
                "message": "Table does not exist. Please run the migration in Supabase Dashboard.",
                "status": "needs_migration",
                "sql": create_table_sql,
                "instructions": [
                    "1. Go to your Supabase Dashboard",
                    "2. Navigate to SQL Editor",
                    "3. Create a new query and paste the SQL below",
                    "4. Run the query to create the table"
                ]
            }
        raise HTTPException(status_code=500, detail=f"Database error: {error_msg}")

@app.post("/api/saas/add-niche-column")
def add_niche_column():
    """Add niche column to saas_apps table if it doesn't exist."""
    try:
        supabase = get_supabase()
        # Try to select with niche to check if it exists
        result = supabase.table("saas_apps").select("niche").limit(1).execute()
        return {"message": "Niche column already exists", "status": "ok"}
    except Exception as e:
        # Column doesn't exist - need to add it via SQL Editor in Supabase dashboard
        return {
            "message": "Niche column does not exist. Please run this SQL in Supabase SQL Editor:",
            "sql": "ALTER TABLE saas_apps ADD COLUMN IF NOT EXISTS niche VARCHAR(255);",
            "dashboard_url": "https://supabase.com/dashboard/project/nvjorsmbjckaaodvlssl/sql/new"
        }

@app.get("/api/saas")
def get_all_saas():
    """Get all SaaS apps."""
    supabase = get_supabase()
    result = supabase.table("saas_apps").select("*").eq("is_active", True).order("mrr", desc=True).execute()
    return {"apps": result.data or [], "count": len(result.data or [])}

@app.get("/api/saas/{slug}")
def get_saas_by_slug(slug: str):
    """Get a single SaaS app by slug."""
    supabase = get_supabase()
    result = supabase.table("saas_apps").select("*").eq("slug", slug).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="SaaS app not found")
    return result.data

@app.post("/api/saas")
def create_saas(saas: SaasCreate):
    """Create a new SaaS app."""
    supabase = get_supabase()

    data = {
        "name": saas.name,
        "description": saas.description,
        "mrr": saas.mrr,
        "website_url": saas.website_url,
        "founder_name": saas.founder_name,
        "category": saas.category,
        "youtube_video_id": saas.youtube_video_id,
    }

    # Remove None values
    data = {k: v for k, v in data.items() if v is not None}

    result = supabase.table("saas_apps").insert(data).execute()
    return result.data[0] if result.data else None

@app.put("/api/saas/{slug}")
def update_saas(slug: str, saas: SaasUpdate):
    """Update a SaaS app."""
    supabase = get_supabase()

    data = saas.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("saas_apps").update(data).eq("slug", slug).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="SaaS app not found")
    return result.data[0]

@app.delete("/api/saas/{slug}")
def delete_saas(slug: str):
    """Soft delete a SaaS app."""
    supabase = get_supabase()
    result = supabase.table("saas_apps").update({"is_active": False}).eq("slug", slug).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="SaaS app not found")
    return {"message": "SaaS app deleted"}

@app.post("/api/saas/{slug}/fetch-transcript")
def fetch_youtube_transcript(slug: str):
    """Fetch YouTube transcript for a SaaS app."""
    supabase = get_supabase()

    # Get the SaaS app
    app_result = supabase.table("saas_apps").select("*").eq("slug", slug).single().execute()
    if not app_result.data:
        raise HTTPException(status_code=404, detail="SaaS app not found")

    video_id = app_result.data.get("youtube_video_id")
    if not video_id:
        raise HTTPException(status_code=400, detail="No YouTube video ID set for this app")

    try:
        from youtube_transcript_api import YouTubeTranscriptApi

        # Fetch transcript
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)

        # Combine into single text
        transcript_text = "\n".join([entry["text"] for entry in transcript_list])

        # Update the database
        supabase.table("saas_apps").update({
            "youtube_transcript": transcript_text
        }).eq("slug", slug).execute()

        return {
            "message": "Transcript fetched successfully",
            "transcript_length": len(transcript_text),
            "transcript_preview": transcript_text[:500] + "..." if len(transcript_text) > 500 else transcript_text
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transcript: {str(e)}")

@app.post("/api/saas/{slug}/extract-info")
def extract_saas_info(slug: str):
    """Use AI to extract SaaS info from the YouTube transcript."""
    supabase = get_supabase()
    openai_client = get_openai()

    # Get the SaaS app
    app_result = supabase.table("saas_apps").select("*").eq("slug", slug).single().execute()
    if not app_result.data:
        raise HTTPException(status_code=404, detail="SaaS app not found")

    transcript = app_result.data.get("youtube_transcript")
    if not transcript:
        raise HTTPException(status_code=400, detail="No transcript available. Fetch transcript first.")

    prompt = f"""Analyze this YouTube video transcript from Starter Story about a SaaS business. Extract the following information:

1. Business name
2. Monthly Recurring Revenue (MRR) - in dollars, just the number
3. Description - 1-2 sentences about what the product does
4. Website URL if mentioned
5. Founder name(s)
6. Business category (e.g., Lead Generation, Email Tools, Productivity, etc.)
7. Business niche - The specific market/industry the business serves (e.g., "Real Estate Agents", "E-commerce", "Restaurants", "Fitness Coaches", "Dentists", "Law Firms", etc.)
8. Tech stack if mentioned (as array)
9. Target market
10. Key metrics mentioned (users, customers, etc.)

Return as JSON with these exact keys:
- name (string)
- mrr (number or null)
- description (string)
- website_url (string or null)
- founder_name (string or null)
- category (string)
- niche (string or null) - the specific industry/market served
- tech_stack (array of strings)
- target_market (string or null)
- key_metrics (object with any mentioned metrics)

Transcript:
{transcript[:8000]}
"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert at extracting business information from transcripts. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )

        extracted = json.loads(response.choices[0].message.content)

        # Update the database with extracted info
        update_data = {}
        if extracted.get("mrr"):
            update_data["mrr"] = extracted["mrr"]
        if extracted.get("description"):
            update_data["description"] = extracted["description"]
        if extracted.get("website_url"):
            update_data["website_url"] = extracted["website_url"]
        if extracted.get("founder_name"):
            update_data["founder_name"] = extracted["founder_name"]
        if extracted.get("category"):
            update_data["category"] = extracted["category"]
        if extracted.get("niche"):
            update_data["niche"] = extracted["niche"]
        if extracted.get("tech_stack"):
            update_data["tech_stack"] = extracted["tech_stack"]
        if extracted.get("target_market"):
            update_data["target_market"] = extracted["target_market"]
        if extracted.get("key_metrics"):
            update_data["key_metrics"] = extracted["key_metrics"]

        if update_data:
            supabase.table("saas_apps").update(update_data).eq("slug", slug).execute()

        return {
            "message": "Info extracted successfully",
            "extracted": extracted,
            "updated_fields": list(update_data.keys())
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract info: {str(e)}")

@app.post("/api/saas/import-from-youtube")
def import_saas_from_youtube(request: FetchTranscriptRequest):
    """Import a new SaaS app from a YouTube video ID."""
    supabase = get_supabase()
    video_id = request.youtube_video_id

    try:
        # First try to get video info
        import requests

        # Check if already exists
        existing = supabase.table("saas_apps").select("slug").eq("youtube_video_id", video_id).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail=f"Video already imported as: {existing.data[0]['slug']}")

        # Fetch transcript
        from youtube_transcript_api import YouTubeTranscriptApi
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        transcript_text = "\n".join([entry["text"] for entry in transcript_list])

        # Create placeholder entry
        result = supabase.table("saas_apps").insert({
            "name": f"Import_{video_id}",  # Temporary name
            "youtube_video_id": video_id,
            "youtube_transcript": transcript_text,
        }).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create SaaS entry")

        slug = result.data[0]["slug"]

        # Now extract info using AI
        openai_client = get_openai()

        prompt = f"""Analyze this YouTube video transcript from Starter Story about a SaaS business. Extract:

1. Business name (required)
2. Monthly Recurring Revenue (MRR) in dollars
3. Description (1-2 sentences)
4. Website URL if mentioned
5. Founder name(s)
6. Business category

Return as JSON:
{{"name": "string", "mrr": number, "description": "string", "website_url": "string or null", "founder_name": "string or null", "category": "string"}}

Transcript:
{transcript_text[:6000]}
"""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Extract business info from this Starter Story transcript. Return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )

        extracted = json.loads(response.choices[0].message.content)

        # Update with extracted info
        update_data = {"name": extracted.get("name", f"SaaS_{video_id}")}
        if extracted.get("mrr"):
            update_data["mrr"] = extracted["mrr"]
        if extracted.get("description"):
            update_data["description"] = extracted["description"]
        if extracted.get("website_url"):
            update_data["website_url"] = extracted["website_url"]
        if extracted.get("founder_name"):
            update_data["founder_name"] = extracted["founder_name"]
        if extracted.get("category"):
            update_data["category"] = extracted["category"]

        # Update and regenerate slug based on real name
        final_result = supabase.table("saas_apps").update(update_data).eq("slug", slug).execute()

        return {
            "message": "SaaS imported successfully",
            "app": final_result.data[0] if final_result.data else result.data[0],
            "extracted": extracted
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import: {str(e)}")


@app.get("/api/channel/videos")
def get_channel_videos(channel_url: str, limit: int = 100):
    """Fetch video list from a YouTube channel URL."""
    import scrapetube
    import re

    try:
        # Extract channel identifier from URL
        # Supports: @username, /channel/ID, /c/customname, /user/username
        channel_id = None
        channel_username = None

        if "/@" in channel_url:
            # Handle @username format
            match = re.search(r'/@([^/\?]+)', channel_url)
            if match:
                channel_username = match.group(1)
        elif "/channel/" in channel_url:
            match = re.search(r'/channel/([^/\?]+)', channel_url)
            if match:
                channel_id = match.group(1)
        elif "/c/" in channel_url:
            match = re.search(r'/c/([^/\?]+)', channel_url)
            if match:
                channel_username = match.group(1)
        elif "/user/" in channel_url:
            match = re.search(r'/user/([^/\?]+)', channel_url)
            if match:
                channel_username = match.group(1)

        if not channel_id and not channel_username:
            raise HTTPException(status_code=400, detail="Could not parse channel URL. Use format: https://www.youtube.com/@channelname")

        # Fetch videos using scrapetube
        if channel_username:
            videos = scrapetube.get_channel(channel_username=channel_username, limit=limit)
        else:
            videos = scrapetube.get_channel(channel_id=channel_id, limit=limit)

        video_list = []
        for video in videos:
            video_list.append({
                "video_id": video.get("videoId"),
                "title": video.get("title", {}).get("runs", [{}])[0].get("text", "Unknown"),
                "thumbnail": video.get("thumbnail", {}).get("thumbnails", [{}])[-1].get("url", ""),
                "duration": video.get("lengthText", {}).get("simpleText", ""),
                "views": video.get("viewCountText", {}).get("simpleText", ""),
                "published": video.get("publishedTimeText", {}).get("simpleText", ""),
            })

        return {
            "channel_url": channel_url,
            "videos": video_list,
            "count": len(video_list)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch channel videos: {str(e)}")


@app.post("/api/channel/import")
def import_channel_videos(request: ChannelImportRequest):
    """Import all videos from a YouTube channel."""
    import scrapetube
    import re
    from youtube_transcript_api import YouTubeTranscriptApi

    supabase = get_supabase()

    try:
        # Extract channel identifier
        channel_id = None
        channel_username = None

        if "/@" in request.channel_url:
            match = re.search(r'/@([^/\?]+)', request.channel_url)
            if match:
                channel_username = match.group(1)
        elif "/channel/" in request.channel_url:
            match = re.search(r'/channel/([^/\?]+)', request.channel_url)
            if match:
                channel_id = match.group(1)
        elif "/c/" in request.channel_url:
            match = re.search(r'/c/([^/\?]+)', request.channel_url)
            if match:
                channel_username = match.group(1)
        elif "/user/" in request.channel_url:
            match = re.search(r'/user/([^/\?]+)', request.channel_url)
            if match:
                channel_username = match.group(1)

        if not channel_id and not channel_username:
            raise HTTPException(status_code=400, detail="Could not parse channel URL")

        # Fetch videos
        if channel_username:
            videos = scrapetube.get_channel(channel_username=channel_username, limit=request.limit)
        else:
            videos = scrapetube.get_channel(channel_id=channel_id, limit=request.limit)

        results = {
            "imported": [],
            "skipped": [],
            "failed": []
        }

        openai_client = None
        if request.analyze:
            try:
                openai_client = get_openai()
            except:
                pass

        for video in videos:
            video_id = video.get("videoId")
            title = video.get("title", {}).get("runs", [{}])[0].get("text", "Unknown")

            if not video_id:
                continue

            # Check if already exists
            existing = supabase.table("saas_apps").select("slug").eq("youtube_video_id", video_id).execute()
            if existing.data:
                results["skipped"].append({
                    "video_id": video_id,
                    "title": title,
                    "reason": "Already imported"
                })
                continue

            try:
                # Fetch transcript
                transcript_text = None
                try:
                    transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
                    transcript_text = "\n".join([entry["text"] for entry in transcript_list])
                except Exception as e:
                    print(f"No transcript for {video_id}: {e}")

                # Extract MRR from title using regex patterns
                mrr_from_title = None
                title_lower = title.lower()

                # Pattern: $XXK/month, $XXK/mo, $XX,XXX/month
                mrr_patterns = [
                    r'\$(\d+(?:,\d+)?)\s*k?\s*/\s*(?:month|mo)\b',  # $30K/month, $30/month
                    r'\$(\d+(?:,\d+)?)\s*k\s*/\s*(?:month|mo)\b',   # $30K/month
                    r'\$(\d+(?:,\d+)?(?:\.\d+)?)\s*m\s*/\s*(?:month|mo)\b',  # $1M/month
                    r'(\d+(?:,\d+)?)\s*k\s*/\s*(?:month|mo)\b',     # 30K/month without $
                    r'\$(\d+(?:,\d+)?)\s*k\s*(?:mrr|arr)\b',        # $100K MRR
                    r'(\d+(?:,\d+)?)\s*k\s*(?:mrr|arr)\b',          # 100K MRR without $
                    r'\$(\d+(?:,\d+)?(?:\.\d+)?)\s*m\s*(?:mrr|arr)\b',  # $1M MRR
                    r'makes?\s*\$(\d+(?:,\d+)?)\s*k\s*/\s*(?:year|yr)\b',  # makes $120K/year -> divide by 12
                ]

                for pattern in mrr_patterns:
                    match = re.search(pattern, title_lower)
                    if match:
                        value_str = match.group(1).replace(',', '')
                        try:
                            value = float(value_str)
                            # Check if it's in millions
                            if 'm' in pattern:
                                mrr_from_title = int(value * 1000000)
                            # Check if it's K (thousands)
                            elif 'k' in pattern.lower() or value < 1000:
                                mrr_from_title = int(value * 1000)
                            else:
                                mrr_from_title = int(value)
                            # If it's yearly, divide by 12
                            if 'year' in pattern or 'yr' in pattern:
                                mrr_from_title = mrr_from_title // 12
                            break
                        except:
                            pass

                # Create entry
                app_data = {
                    "name": title[:250],
                    "youtube_video_id": video_id,
                    "youtube_title": title,
                    "youtube_transcript": transcript_text,
                    "mrr": mrr_from_title,  # Set MRR from title if found
                }

                # Extract info with AI if transcript available OR analyze title
                if openai_client and request.analyze:
                    try:
                        # Use transcript if available, otherwise use title
                        content_to_analyze = transcript_text[:5000] if transcript_text else f"Video Title: {title}"
                        content_type = "transcript" if transcript_text else "title"

                        prompt = f"""Analyze this YouTube video {content_type}. If it's about a SaaS/software business, extract:

1. Business name (required) - extract the actual product/company name mentioned, not the video title
2. Monthly Recurring Revenue (MRR) in dollars - just the number. Parse from mentions like "$30K/month" = 30000, "$100K MRR" = 100000, "$1M/month" = 1000000
3. Description (1-2 sentences about what the product does)
4. Website URL if mentioned
5. Founder name(s)
6. Business category (e.g., Lead Generation, Email Tools, Productivity, Mobile App, etc.)

If this video is NOT about a specific SaaS/software business (e.g., it's a general tips video, interview compilation, etc.), return {{"is_saas": false}}

Return as JSON:
{{"is_saas": true/false, "name": "string", "mrr": number or null, "description": "string", "website_url": "string or null", "founder_name": "string or null", "category": "string"}}

{content_type.title()}:
{content_to_analyze}
"""
                        response = openai_client.chat.completions.create(
                            model="gpt-4o-mini",
                            messages=[
                                {"role": "system", "content": "Extract business info from transcripts. Return valid JSON."},
                                {"role": "user", "content": prompt}
                            ],
                            response_format={"type": "json_object"}
                        )

                        extracted = json.loads(response.choices[0].message.content)

                        if extracted.get("is_saas") == False:
                            results["skipped"].append({
                                "video_id": video_id,
                                "title": title,
                                "reason": "Not a SaaS business video"
                            })
                            continue

                        if extracted.get("name"):
                            app_data["name"] = extracted["name"]
                        # AI-extracted MRR takes priority over regex-extracted
                        if extracted.get("mrr"):
                            app_data["mrr"] = extracted["mrr"]
                        if extracted.get("description"):
                            app_data["description"] = extracted["description"]
                        if extracted.get("website_url"):
                            app_data["website_url"] = extracted["website_url"]
                        if extracted.get("founder_name"):
                            app_data["founder_name"] = extracted["founder_name"]
                        if extracted.get("category"):
                            app_data["category"] = extracted["category"]

                    except Exception as e:
                        print(f"AI extraction failed for {video_id}: {e}")

                result = supabase.table("saas_apps").insert(app_data).execute()

                if result.data:
                    results["imported"].append({
                        "video_id": video_id,
                        "title": title,
                        "slug": result.data[0].get("slug"),
                        "mrr": app_data.get("mrr")
                    })

            except Exception as e:
                results["failed"].append({
                    "video_id": video_id,
                    "title": title,
                    "error": str(e)
                })

        return {
            "message": f"Channel import complete",
            "channel_url": request.channel_url,
            "summary": {
                "imported": len(results["imported"]),
                "skipped": len(results["skipped"]),
                "failed": len(results["failed"])
            },
            "results": results
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Channel import failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8892)
