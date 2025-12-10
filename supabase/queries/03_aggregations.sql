-- ============================================================================
-- HYPERTRENDING.COM - Aggregation & Analytics Queries
-- ============================================================================
-- Queries for rollups, summaries, and analytical calculations.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DAILY ROLLUP FOR KEYWORDS
-- ----------------------------------------------------------------------------
-- Aggregate hourly data into daily summaries

create or replace function public.get_daily_rollup(
    p_keyword_id uuid,
    p_source_code public.source_code default 'GOOGLE_TRENDS',
    p_region text default 'US',
    p_days_back integer default 30
)
returns table (
    date date,
    avg_interest numeric,
    min_interest smallint,
    max_interest smallint,
    data_points bigint,
    volatility numeric  -- intraday range as % of average
)
language sql
stable
as $$
    select
        kt.ts::date as date,
        round(avg(kt.interest_value), 2) as avg_interest,
        min(kt.interest_value) as min_interest,
        max(kt.interest_value) as max_interest,
        count(*) as data_points,
        case
            when avg(kt.interest_value) = 0 then 0
            else round(
                ((max(kt.interest_value) - min(kt.interest_value))::numeric /
                 avg(kt.interest_value)) * 100,
                2
            )
        end as volatility
    from public.keyword_timeseries kt
    join public.sources s on s.id = kt.source_id
    where kt.keyword_id = p_keyword_id
      and s.code = p_source_code
      and kt.region = p_region
      and kt.granularity = 'hour'
      and kt.ts >= now() - (p_days_back || ' days')::interval
    group by kt.ts::date
    order by kt.ts::date desc;
$$;

comment on function public.get_daily_rollup is
    'Aggregate hourly interest data into daily summaries';


-- ----------------------------------------------------------------------------
-- 2. REGIONAL SUMMARY
-- ----------------------------------------------------------------------------
-- Compare a keyword's performance across all tracked regions

create or replace function public.get_regional_summary(
    p_keyword_id uuid,
    p_source_code public.source_code default 'GOOGLE_TRENDS',
    p_days_back integer default 7
)
returns table (
    region text,
    avg_interest numeric,
    max_interest smallint,
    latest_interest smallint,
    trend_direction text,
    data_points bigint
)
language sql
stable
as $$
    with regional_data as (
        select
            kt.region,
            kt.interest_value,
            kt.ts,
            row_number() over (partition by kt.region order by kt.ts desc) as rn,
            first_value(kt.interest_value) over (
                partition by kt.region order by kt.ts desc
            ) as latest_val,
            first_value(kt.interest_value) over (
                partition by kt.region order by kt.ts asc
            ) as oldest_val
        from public.keyword_timeseries kt
        join public.sources s on s.id = kt.source_id
        where kt.keyword_id = p_keyword_id
          and s.code = p_source_code
          and kt.ts >= now() - (p_days_back || ' days')::interval
    )
    select
        region,
        round(avg(interest_value), 2) as avg_interest,
        max(interest_value) as max_interest,
        max(latest_val)::smallint as latest_interest,
        case
            when max(latest_val) > max(oldest_val) then 'RISING'
            when max(latest_val) < max(oldest_val) then 'FALLING'
            else 'STABLE'
        end as trend_direction,
        count(*) as data_points
    from regional_data
    group by region
    order by avg(interest_value) desc;
$$;

comment on function public.get_regional_summary is
    'Compare keyword performance across all regions';


-- ----------------------------------------------------------------------------
-- 3. TOP KEYWORDS BY CATEGORY
-- ----------------------------------------------------------------------------
-- Get top trending keywords grouped by category

create or replace function public.get_top_by_category(
    p_mission_run_id uuid,
    p_region text default 'US',
    p_top_per_category integer default 5
)
returns table (
    category text,
    rank_in_category integer,
    keyword text,
    keyword_id uuid,
    trend_score numeric,
    current_interest smallint
)
language sql
stable
as $$
    with ranked as (
        select
            coalesce(k.category, 'Uncategorized') as category,
            k.keyword,
            k.id as keyword_id,
            res.trend_score,
            res.current_interest,
            row_number() over (
                partition by coalesce(k.category, 'Uncategorized')
                order by res.trend_score desc
            ) as cat_rank
        from public.mission_results res
        join public.keywords k on k.id = res.keyword_id
        where res.mission_run_id = p_mission_run_id
          and res.region = p_region
    )
    select
        category,
        cat_rank as rank_in_category,
        keyword,
        keyword_id,
        trend_score,
        current_interest
    from ranked
    where cat_rank <= p_top_per_category
    order by category, cat_rank;
$$;

comment on function public.get_top_by_category is
    'Get top trending keywords grouped by category';


-- ----------------------------------------------------------------------------
-- 4. HOURLY DISTRIBUTION (Best Hours)
-- ----------------------------------------------------------------------------
-- Which hours of the day show highest interest?

create or replace function public.get_hourly_distribution(
    p_keyword_id uuid,
    p_source_code public.source_code default 'GOOGLE_TRENDS',
    p_region text default 'US',
    p_days_back integer default 30
)
returns table (
    hour_of_day integer,
    avg_interest numeric,
    interest_index numeric,
    sample_count bigint,
    peak_indicator text
)
language sql
stable
as $$
    with hourly_data as (
        select
            extract(hour from kt.ts)::integer as hour,
            kt.interest_value
        from public.keyword_timeseries kt
        join public.sources s on s.id = kt.source_id
        where kt.keyword_id = p_keyword_id
          and s.code = p_source_code
          and kt.region = p_region
          and kt.granularity = 'hour'
          and kt.ts >= now() - (p_days_back || ' days')::interval
    ),
    overall as (
        select avg(interest_value) as overall_avg from hourly_data
    ),
    hour_stats as (
        select
            hour,
            avg(interest_value) as avg_val,
            count(*) as cnt
        from hourly_data
        group by hour
    )
    select
        hs.hour as hour_of_day,
        round(hs.avg_val, 2) as avg_interest,
        round((hs.avg_val / o.overall_avg) * 100, 2) as interest_index,
        hs.cnt as sample_count,
        case
            when hs.avg_val = (select max(avg_val) from hour_stats) then 'PEAK'
            when hs.avg_val >= o.overall_avg * 1.1 then 'HIGH'
            when hs.avg_val <= o.overall_avg * 0.9 then 'LOW'
            else 'AVERAGE'
        end as peak_indicator
    from hour_stats hs, overall o
    order by hs.hour;
$$;

comment on function public.get_hourly_distribution is
    'Analyze hourly interest distribution for a keyword';


-- ----------------------------------------------------------------------------
-- 5. MISSION RUN STATISTICS
-- ----------------------------------------------------------------------------
-- Detailed stats for a mission run

create or replace function public.get_run_statistics(
    p_mission_run_id uuid
)
returns table (
    stat_name text,
    stat_value text
)
language sql
stable
as $$
    with run_data as (
        select
            mr.id,
            mr.run_number,
            mr.status,
            mr.started_at,
            mr.completed_at,
            mr.duration_ms,
            mr.keywords_scanned,
            mr.keywords_matched,
            m.name as mission_name
        from public.mission_runs mr
        join public.missions m on m.id = mr.mission_id
        where mr.id = p_mission_run_id
    ),
    result_stats as (
        select
            count(*) as total_results,
            count(distinct keyword_id) as unique_keywords,
            count(distinct region) as regions,
            count(distinct source_id) as sources,
            round(avg(trend_score), 2) as avg_trend_score,
            max(trend_score) as max_trend_score,
            round(avg(current_interest), 2) as avg_interest
        from public.mission_results
        where mission_run_id = p_mission_run_id
    )
    select * from (
        select 'Mission' as stat_name, rd.mission_name as stat_value from run_data rd
        union all
        select 'Run Number', rd.run_number::text from run_data rd
        union all
        select 'Status', rd.status::text from run_data rd
        union all
        select 'Started At', rd.started_at::text from run_data rd
        union all
        select 'Duration (ms)', rd.duration_ms::text from run_data rd
        union all
        select 'Keywords Scanned', rd.keywords_scanned::text from run_data rd
        union all
        select 'Keywords Matched', rd.keywords_matched::text from run_data rd
        union all
        select 'Total Results', rs.total_results::text from result_stats rs
        union all
        select 'Unique Keywords', rs.unique_keywords::text from result_stats rs
        union all
        select 'Regions Covered', rs.regions::text from result_stats rs
        union all
        select 'Sources Used', rs.sources::text from result_stats rs
        union all
        select 'Avg Trend Score', rs.avg_trend_score::text from result_stats rs
        union all
        select 'Max Trend Score', rs.max_trend_score::text from result_stats rs
        union all
        select 'Avg Interest', rs.avg_interest::text from result_stats rs
    ) t;
$$;

comment on function public.get_run_statistics is
    'Get detailed statistics for a mission run';


-- ----------------------------------------------------------------------------
-- 6. TREND SCORE DISTRIBUTION
-- ----------------------------------------------------------------------------
-- Histogram of trend scores for a run

create or replace function public.get_trend_score_distribution(
    p_mission_run_id uuid,
    p_bucket_size numeric default 10
)
returns table (
    bucket_min numeric,
    bucket_max numeric,
    count bigint,
    percentage numeric
)
language sql
stable
as $$
    with bucketed as (
        select
            floor(trend_score / p_bucket_size) * p_bucket_size as bucket
        from public.mission_results
        where mission_run_id = p_mission_run_id
    ),
    total as (
        select count(*)::numeric as total_count from bucketed
    )
    select
        bucket as bucket_min,
        bucket + p_bucket_size as bucket_max,
        count(*) as count,
        round((count(*)::numeric / t.total_count) * 100, 2) as percentage
    from bucketed b, total t
    group by bucket, t.total_count
    order by bucket;
$$;

comment on function public.get_trend_score_distribution is
    'Get histogram distribution of trend scores in a run';


-- ----------------------------------------------------------------------------
-- 7. WORKSPACE USAGE STATS
-- ----------------------------------------------------------------------------
-- Overview of workspace activity

create or replace function public.get_workspace_stats(
    p_workspace_id uuid
)
returns table (
    stat_name text,
    stat_value bigint
)
language sql
stable
as $$
    select 'Total Missions', count(*)
    from public.missions where workspace_id = p_workspace_id

    union all

    select 'Active Missions', count(*)
    from public.missions where workspace_id = p_workspace_id and status = 'ACTIVE'

    union all

    select 'Total Runs (All Time)', count(*)
    from public.mission_runs mr
    join public.missions m on m.id = mr.mission_id
    where m.workspace_id = p_workspace_id

    union all

    select 'Runs (Last 7 Days)', count(*)
    from public.mission_runs mr
    join public.missions m on m.id = mr.mission_id
    where m.workspace_id = p_workspace_id
      and mr.started_at >= now() - interval '7 days'

    union all

    select 'Completed Runs', count(*)
    from public.mission_runs mr
    join public.missions m on m.id = mr.mission_id
    where m.workspace_id = p_workspace_id
      and mr.status = 'COMPLETED'

    union all

    select 'Failed Runs', count(*)
    from public.mission_runs mr
    join public.missions m on m.id = mr.mission_id
    where m.workspace_id = p_workspace_id
      and mr.status = 'FAILED'

    union all

    select 'Team Members', count(*)
    from public.workspace_members where workspace_id = p_workspace_id

    union all

    select 'API Keys', count(*)
    from public.api_keys where workspace_id = p_workspace_id and is_active = true;
$$;

comment on function public.get_workspace_stats is
    'Get usage statistics for a workspace';


-- ----------------------------------------------------------------------------
-- 8. SOURCE PERFORMANCE COMPARISON
-- ----------------------------------------------------------------------------
-- Compare data availability and quality across sources

create or replace function public.get_source_comparison(
    p_days_back integer default 7
)
returns table (
    source_code public.source_code,
    source_name text,
    total_data_points bigint,
    unique_keywords bigint,
    regions_covered bigint,
    avg_daily_points numeric,
    latest_data_at timestamptz
)
language sql
stable
as $$
    select
        s.code as source_code,
        s.name as source_name,
        count(*) as total_data_points,
        count(distinct kt.keyword_id) as unique_keywords,
        count(distinct kt.region) as regions_covered,
        round(count(*)::numeric / p_days_back, 2) as avg_daily_points,
        max(kt.ts) as latest_data_at
    from public.sources s
    left join public.keyword_timeseries kt
        on kt.source_id = s.id
        and kt.ts >= now() - (p_days_back || ' days')::interval
    where s.is_active = true
    group by s.id, s.code, s.name
    order by count(*) desc;
$$;

comment on function public.get_source_comparison is
    'Compare data volume and quality across sources';


-- ----------------------------------------------------------------------------
-- 9. MATERIALIZED VIEW: Daily Trending Summary
-- ----------------------------------------------------------------------------
-- Pre-computed daily summaries for fast dashboard loading

create materialized view if not exists public.mv_daily_trending_summary as
with latest_runs as (
    select distinct on (m.id)
        m.id as mission_id,
        m.workspace_id,
        m.name as mission_name,
        mr.id as run_id,
        mr.run_number,
        mr.completed_at
    from public.missions m
    join public.mission_runs mr on mr.mission_id = m.id
    where mr.status = 'COMPLETED'
      and mr.completed_at >= now() - interval '24 hours'
    order by m.id, mr.completed_at desc
)
select
    lr.workspace_id,
    lr.mission_id,
    lr.mission_name,
    lr.run_id,
    lr.run_number,
    lr.completed_at,
    res.region,
    res.time_window,
    count(*) as result_count,
    round(avg(res.trend_score), 2) as avg_trend_score,
    max(res.trend_score) as max_trend_score,
    round(avg(res.current_interest), 2) as avg_interest
from latest_runs lr
join public.mission_results res on res.mission_run_id = lr.run_id
group by
    lr.workspace_id,
    lr.mission_id,
    lr.mission_name,
    lr.run_id,
    lr.run_number,
    lr.completed_at,
    res.region,
    res.time_window;

-- Index for fast workspace lookups
create index if not exists idx_mv_daily_summary_workspace
    on public.mv_daily_trending_summary (workspace_id);

-- Function to refresh the materialized view
create or replace function public.refresh_daily_trending_summary()
returns void
language sql
as $$
    refresh materialized view public.mv_daily_trending_summary;
$$;

comment on materialized view public.mv_daily_trending_summary is
    'Pre-computed daily trending summaries for fast dashboard loading';
