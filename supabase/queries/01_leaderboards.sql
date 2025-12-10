-- ============================================================================
-- HYPERTRENDING.COM - Leaderboard & Ranking Queries
-- ============================================================================
-- Queries for displaying trending keyword rankings and leaderboards.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TOP TRENDING KEYWORDS FROM LATEST RUN
-- ----------------------------------------------------------------------------
-- Get the top N trending keywords from the most recent completed run of a mission

create or replace function public.get_latest_trending(
    p_mission_id uuid,
    p_limit integer default 25,
    p_region text default null,
    p_time_window public.time_window default null
)
returns table (
    rank_position integer,
    keyword text,
    keyword_id uuid,
    trend_score numeric,
    current_interest smallint,
    baseline_interest smallint,
    change_percent numeric,
    region text,
    time_window public.time_window,
    source_name text,
    related_keywords text[]
)
language sql
stable
as $$
    with latest_run as (
        select mr.id
        from public.mission_runs mr
        where mr.mission_id = p_mission_id
          and mr.status = 'COMPLETED'
        order by mr.completed_at desc
        limit 1
    )
    select
        res.rank_position,
        k.keyword,
        k.id as keyword_id,
        res.trend_score,
        res.current_interest,
        res.baseline_interest,
        round(((res.current_interest - res.baseline_interest)::numeric /
               nullif(res.baseline_interest, 0)) * 100, 2) as change_percent,
        res.region,
        res.time_window,
        s.name as source_name,
        res.related_keywords
    from public.mission_results res
    join latest_run lr on lr.id = res.mission_run_id
    join public.keywords k on k.id = res.keyword_id
    join public.sources s on s.id = res.source_id
    where (p_region is null or res.region = p_region)
      and (p_time_window is null or res.time_window = p_time_window)
    order by res.rank_position
    limit p_limit;
$$;

comment on function public.get_latest_trending is
    'Get top trending keywords from the latest completed run of a mission';


-- ----------------------------------------------------------------------------
-- 2. TRENDING LEADERBOARD WITH MOVEMENT INDICATORS
-- ----------------------------------------------------------------------------
-- Shows rank changes compared to previous run (movers & shakers)

create or replace function public.get_trending_with_movement(
    p_mission_id uuid,
    p_limit integer default 50,
    p_region text default null
)
returns table (
    rank_position integer,
    rank_change integer,
    movement_label text,  -- 'NEW', 'UP', 'DOWN', 'SAME'
    keyword text,
    keyword_id uuid,
    trend_score numeric,
    trend_score_change numeric,
    current_interest smallint,
    region text,
    time_window public.time_window
)
language sql
stable
as $$
    with runs as (
        select
            id,
            row_number() over (order by completed_at desc) as run_order
        from public.mission_runs
        where mission_id = p_mission_id
          and status = 'COMPLETED'
        order by completed_at desc
        limit 2
    ),
    latest as (select id from runs where run_order = 1),
    previous as (select id from runs where run_order = 2),
    current_results as (
        select
            res.*,
            k.keyword
        from public.mission_results res
        join latest l on l.id = res.mission_run_id
        join public.keywords k on k.id = res.keyword_id
        where (p_region is null or res.region = p_region)
    ),
    previous_results as (
        select
            res.keyword_id,
            res.region,
            res.time_window,
            res.rank_position as prev_rank,
            res.trend_score as prev_score
        from public.mission_results res
        join previous p on p.id = res.mission_run_id
    )
    select
        cr.rank_position,
        coalesce(pr.prev_rank - cr.rank_position, 0) as rank_change,
        case
            when pr.prev_rank is null then 'NEW'
            when pr.prev_rank > cr.rank_position then 'UP'
            when pr.prev_rank < cr.rank_position then 'DOWN'
            else 'SAME'
        end as movement_label,
        cr.keyword,
        cr.keyword_id,
        cr.trend_score,
        cr.trend_score - coalesce(pr.prev_score, cr.trend_score) as trend_score_change,
        cr.current_interest,
        cr.region,
        cr.time_window
    from current_results cr
    left join previous_results pr
        on pr.keyword_id = cr.keyword_id
        and pr.region = cr.region
        and pr.time_window = cr.time_window
    order by cr.rank_position
    limit p_limit;
$$;

comment on function public.get_trending_with_movement is
    'Trending leaderboard with rank movement compared to previous run';


-- ----------------------------------------------------------------------------
-- 3. BIGGEST MOVERS (UP)
-- ----------------------------------------------------------------------------
-- Keywords with the biggest positive rank change

create or replace function public.get_biggest_gainers(
    p_mission_id uuid,
    p_limit integer default 10,
    p_region text default null
)
returns table (
    keyword text,
    keyword_id uuid,
    current_rank integer,
    previous_rank integer,
    rank_jump integer,
    trend_score numeric,
    current_interest smallint
)
language sql
stable
as $$
    with runs as (
        select
            id,
            row_number() over (order by completed_at desc) as run_order
        from public.mission_runs
        where mission_id = p_mission_id
          and status = 'COMPLETED'
        limit 2
    ),
    current_results as (
        select res.*, k.keyword
        from public.mission_results res
        join runs r on r.id = res.mission_run_id and r.run_order = 1
        join public.keywords k on k.id = res.keyword_id
        where (p_region is null or res.region = p_region)
    ),
    previous_results as (
        select res.keyword_id, res.region, res.time_window, res.rank_position
        from public.mission_results res
        join runs r on r.id = res.mission_run_id and r.run_order = 2
    )
    select
        cr.keyword,
        cr.keyword_id,
        cr.rank_position as current_rank,
        pr.rank_position as previous_rank,
        pr.rank_position - cr.rank_position as rank_jump,
        cr.trend_score,
        cr.current_interest
    from current_results cr
    join previous_results pr
        on pr.keyword_id = cr.keyword_id
        and pr.region = cr.region
        and pr.time_window = cr.time_window
    where pr.rank_position > cr.rank_position  -- moved up
    order by (pr.rank_position - cr.rank_position) desc
    limit p_limit;
$$;

comment on function public.get_biggest_gainers is
    'Keywords with biggest positive rank movement';


-- ----------------------------------------------------------------------------
-- 4. NEW ENTRIES (First-time appearances)
-- ----------------------------------------------------------------------------
-- Keywords that appeared in this run but not the previous one

create or replace function public.get_new_trending(
    p_mission_id uuid,
    p_limit integer default 20,
    p_region text default null
)
returns table (
    keyword text,
    keyword_id uuid,
    rank_position integer,
    trend_score numeric,
    current_interest smallint,
    region text,
    time_window public.time_window,
    first_seen_at timestamptz
)
language sql
stable
as $$
    with runs as (
        select
            id,
            row_number() over (order by completed_at desc) as run_order
        from public.mission_runs
        where mission_id = p_mission_id
          and status = 'COMPLETED'
        limit 2
    ),
    current_results as (
        select res.*, k.keyword, k.first_seen_at
        from public.mission_results res
        join runs r on r.id = res.mission_run_id and r.run_order = 1
        join public.keywords k on k.id = res.keyword_id
        where (p_region is null or res.region = p_region)
    ),
    previous_keywords as (
        select distinct res.keyword_id, res.region, res.time_window
        from public.mission_results res
        join runs r on r.id = res.mission_run_id and r.run_order = 2
    )
    select
        cr.keyword,
        cr.keyword_id,
        cr.rank_position,
        cr.trend_score,
        cr.current_interest,
        cr.region,
        cr.time_window,
        cr.first_seen_at
    from current_results cr
    left join previous_keywords pk
        on pk.keyword_id = cr.keyword_id
        and pk.region = cr.region
        and pk.time_window = cr.time_window
    where pk.keyword_id is null  -- not in previous run
    order by cr.rank_position
    limit p_limit;
$$;

comment on function public.get_new_trending is
    'Keywords appearing for the first time in this run';


-- ----------------------------------------------------------------------------
-- 5. TOP BY REGION COMPARISON
-- ----------------------------------------------------------------------------
-- Compare top keywords across multiple regions

create or replace function public.get_regional_comparison(
    p_mission_id uuid,
    p_regions text[],  -- e.g., ARRAY['US', 'GB', 'CA']
    p_top_n integer default 10
)
returns table (
    region text,
    rank_position integer,
    keyword text,
    keyword_id uuid,
    trend_score numeric,
    current_interest smallint
)
language sql
stable
as $$
    with latest_run as (
        select id
        from public.mission_runs
        where mission_id = p_mission_id
          and status = 'COMPLETED'
        order by completed_at desc
        limit 1
    ),
    ranked as (
        select
            res.region,
            res.rank_position,
            k.keyword,
            k.id as keyword_id,
            res.trend_score,
            res.current_interest,
            row_number() over (partition by res.region order by res.rank_position) as rn
        from public.mission_results res
        join latest_run lr on lr.id = res.mission_run_id
        join public.keywords k on k.id = res.keyword_id
        where res.region = any(p_regions)
    )
    select
        region,
        rank_position,
        keyword,
        keyword_id,
        trend_score,
        current_interest
    from ranked
    where rn <= p_top_n
    order by region, rank_position;
$$;

comment on function public.get_regional_comparison is
    'Compare top trending keywords across multiple regions';


-- ----------------------------------------------------------------------------
-- 6. KEYWORD RANKING HISTORY
-- ----------------------------------------------------------------------------
-- Track a keyword's rank position over multiple runs

create or replace function public.get_keyword_rank_history(
    p_keyword_id uuid,
    p_mission_id uuid,
    p_region text default 'US',
    p_limit integer default 30  -- last N runs
)
returns table (
    run_number integer,
    run_completed_at timestamptz,
    rank_position integer,
    trend_score numeric,
    current_interest smallint,
    baseline_interest smallint
)
language sql
stable
as $$
    select
        mr.run_number,
        mr.completed_at as run_completed_at,
        res.rank_position,
        res.trend_score,
        res.current_interest,
        res.baseline_interest
    from public.mission_results res
    join public.mission_runs mr on mr.id = res.mission_run_id
    where res.keyword_id = p_keyword_id
      and mr.mission_id = p_mission_id
      and mr.status = 'COMPLETED'
      and res.region = p_region
    order by mr.completed_at desc
    limit p_limit;
$$;

comment on function public.get_keyword_rank_history is
    'Track a keyword''s ranking position over multiple mission runs';


-- ----------------------------------------------------------------------------
-- 7. MULTI-SOURCE LEADERBOARD
-- ----------------------------------------------------------------------------
-- Aggregate rankings across multiple sources (weighted)

create or replace function public.get_multi_source_trending(
    p_mission_run_id uuid,
    p_region text default 'US',
    p_limit integer default 25
)
returns table (
    keyword text,
    keyword_id uuid,
    sources_count integer,
    sources text[],
    avg_trend_score numeric,
    max_trend_score numeric,
    combined_interest integer,
    best_rank integer
)
language sql
stable
as $$
    select
        k.keyword,
        k.id as keyword_id,
        count(distinct res.source_id)::integer as sources_count,
        array_agg(distinct s.name) as sources,
        round(avg(res.trend_score), 2) as avg_trend_score,
        max(res.trend_score) as max_trend_score,
        sum(res.current_interest)::integer as combined_interest,
        min(res.rank_position) as best_rank
    from public.mission_results res
    join public.keywords k on k.id = res.keyword_id
    join public.sources s on s.id = res.source_id
    where res.mission_run_id = p_mission_run_id
      and res.region = p_region
    group by k.id, k.keyword
    order by avg(res.trend_score) desc
    limit p_limit;
$$;

comment on function public.get_multi_source_trending is
    'Aggregate trending keywords across multiple data sources';
