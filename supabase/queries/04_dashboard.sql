-- ============================================================================
-- HYPERTRENDING.COM - Dashboard & Summary Queries
-- ============================================================================
-- Queries optimized for dashboard widgets and real-time displays.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. WORKSPACE DASHBOARD OVERVIEW
-- ----------------------------------------------------------------------------
-- Single query to populate main dashboard cards

create or replace function public.get_dashboard_overview(
    p_workspace_id uuid
)
returns table (
    -- Mission counts
    total_missions bigint,
    active_missions bigint,
    -- Run stats
    runs_today bigint,
    runs_this_week bigint,
    success_rate numeric,
    -- Latest activity
    last_run_at timestamptz,
    last_run_status public.run_status,
    last_run_mission text,
    -- Trending stats
    trending_keywords_found bigint,
    avg_trend_score numeric,
    top_region text
)
language sql
stable
as $$
    with mission_stats as (
        select
            count(*) as total,
            count(*) filter (where status = 'ACTIVE') as active
        from public.missions
        where workspace_id = p_workspace_id
    ),
    run_stats as (
        select
            count(*) filter (where mr.started_at::date = current_date) as today,
            count(*) filter (where mr.started_at >= now() - interval '7 days') as this_week,
            count(*) filter (where mr.status = 'COMPLETED') as completed,
            count(*) as total
        from public.mission_runs mr
        join public.missions m on m.id = mr.mission_id
        where m.workspace_id = p_workspace_id
          and mr.started_at >= now() - interval '30 days'
    ),
    latest_run as (
        select
            mr.completed_at,
            mr.status,
            m.name as mission_name
        from public.mission_runs mr
        join public.missions m on m.id = mr.mission_id
        where m.workspace_id = p_workspace_id
        order by mr.started_at desc
        limit 1
    ),
    recent_results as (
        select
            res.region,
            res.trend_score
        from public.mission_results res
        join public.mission_runs mr on mr.id = res.mission_run_id
        join public.missions m on m.id = mr.mission_id
        where m.workspace_id = p_workspace_id
          and mr.completed_at >= now() - interval '24 hours'
    ),
    result_stats as (
        select
            count(*) as keywords_found,
            round(avg(trend_score), 2) as avg_score
        from recent_results
    ),
    top_region as (
        select region, count(*) as cnt
        from recent_results
        group by region
        order by cnt desc
        limit 1
    )
    select
        ms.total as total_missions,
        ms.active as active_missions,
        rs.today as runs_today,
        rs.this_week as runs_this_week,
        case when rs.total = 0 then 0
             else round((rs.completed::numeric / rs.total) * 100, 1)
        end as success_rate,
        lr.completed_at as last_run_at,
        lr.status as last_run_status,
        lr.mission_name as last_run_mission,
        coalesce(rst.keywords_found, 0) as trending_keywords_found,
        coalesce(rst.avg_score, 0) as avg_trend_score,
        tr.region as top_region
    from mission_stats ms
    cross join run_stats rs
    left join latest_run lr on true
    left join result_stats rst on true
    left join top_region tr on true;
$$;

comment on function public.get_dashboard_overview is
    'Get all dashboard overview metrics in a single query';


-- ----------------------------------------------------------------------------
-- 2. MISSION CARDS (List of missions with quick stats)
-- ----------------------------------------------------------------------------

create or replace function public.get_mission_cards(
    p_workspace_id uuid,
    p_status public.mission_status default null,
    p_limit integer default 20
)
returns table (
    mission_id uuid,
    name text,
    status public.mission_status,
    total_runs integer,
    last_run_at timestamptz,
    last_run_status public.run_status,
    last_run_keywords integer,
    next_run_at timestamptz,
    created_at timestamptz
)
language sql
stable
as $$
    with latest_runs as (
        select distinct on (mission_id)
            mission_id,
            status,
            completed_at,
            keywords_matched
        from public.mission_runs
        order by mission_id, started_at desc
    )
    select
        m.id as mission_id,
        m.name,
        m.status,
        m.total_runs,
        lr.completed_at as last_run_at,
        lr.status as last_run_status,
        lr.keywords_matched as last_run_keywords,
        m.next_run_at,
        m.created_at
    from public.missions m
    left join latest_runs lr on lr.mission_id = m.id
    where m.workspace_id = p_workspace_id
      and (p_status is null or m.status = p_status)
    order by m.updated_at desc
    limit p_limit;
$$;

comment on function public.get_mission_cards is
    'Get mission list with quick stats for dashboard cards';


-- ----------------------------------------------------------------------------
-- 3. RECENT RUNS FEED
-- ----------------------------------------------------------------------------
-- Activity feed showing recent mission runs

create or replace function public.get_recent_runs_feed(
    p_workspace_id uuid,
    p_limit integer default 20
)
returns table (
    run_id uuid,
    mission_id uuid,
    mission_name text,
    run_number integer,
    status public.run_status,
    started_at timestamptz,
    completed_at timestamptz,
    duration_ms integer,
    keywords_matched integer,
    time_ago text
)
language sql
stable
as $$
    select
        mr.id as run_id,
        m.id as mission_id,
        m.name as mission_name,
        mr.run_number,
        mr.status,
        mr.started_at,
        mr.completed_at,
        mr.duration_ms,
        mr.keywords_matched,
        case
            when mr.started_at >= now() - interval '1 minute' then 'just now'
            when mr.started_at >= now() - interval '1 hour' then
                extract(minute from now() - mr.started_at)::integer || 'm ago'
            when mr.started_at >= now() - interval '1 day' then
                extract(hour from now() - mr.started_at)::integer || 'h ago'
            else extract(day from now() - mr.started_at)::integer || 'd ago'
        end as time_ago
    from public.mission_runs mr
    join public.missions m on m.id = mr.mission_id
    where m.workspace_id = p_workspace_id
    order by mr.started_at desc
    limit p_limit;
$$;

comment on function public.get_recent_runs_feed is
    'Activity feed of recent mission runs';


-- ----------------------------------------------------------------------------
-- 4. TRENDING NOW WIDGET
-- ----------------------------------------------------------------------------
-- Quick view of hottest trending keywords right now

create or replace function public.get_trending_now_widget(
    p_workspace_id uuid,
    p_limit integer default 10,
    p_region text default null
)
returns table (
    keyword text,
    keyword_id uuid,
    trend_score numeric,
    current_interest smallint,
    change_indicator text,
    source_name text,
    mission_name text
)
language sql
stable
as $$
    with latest_runs as (
        select distinct on (m.id)
            m.id as mission_id,
            m.name as mission_name,
            mr.id as run_id
        from public.missions m
        join public.mission_runs mr on mr.mission_id = m.id
        where m.workspace_id = p_workspace_id
          and m.status = 'ACTIVE'
          and mr.status = 'COMPLETED'
        order by m.id, mr.completed_at desc
    )
    select
        k.keyword,
        k.id as keyword_id,
        res.trend_score,
        res.current_interest,
        case
            when res.rank_change is null then 'NEW'
            when res.rank_change > 0 then '+' || res.rank_change
            when res.rank_change < 0 then res.rank_change::text
            else '-'
        end as change_indicator,
        s.name as source_name,
        lr.mission_name
    from latest_runs lr
    join public.mission_results res on res.mission_run_id = lr.run_id
    join public.keywords k on k.id = res.keyword_id
    join public.sources s on s.id = res.source_id
    where (p_region is null or res.region = p_region)
    order by res.trend_score desc
    limit p_limit;
$$;

comment on function public.get_trending_now_widget is
    'Quick widget showing hottest trending keywords';


-- ----------------------------------------------------------------------------
-- 5. SPARKLINE DATA (Mini charts)
-- ----------------------------------------------------------------------------
-- Get compact timeseries data for sparkline charts

create or replace function public.get_sparkline_data(
    p_keyword_id uuid,
    p_points integer default 24  -- number of data points
)
returns smallint[]
language sql
stable
as $$
    select array_agg(interest_value order by ts)
    from (
        select
            kt.ts,
            kt.interest_value
        from public.keyword_timeseries kt
        join public.sources s on s.id = kt.source_id
        where kt.keyword_id = p_keyword_id
          and s.code = 'GOOGLE_TRENDS'
          and kt.granularity = 'hour'
        order by kt.ts desc
        limit p_points
    ) sub;
$$;

comment on function public.get_sparkline_data is
    'Get compact timeseries array for sparkline mini-charts';


-- ----------------------------------------------------------------------------
-- 6. TRENDING WITH SPARKLINES (Combined query)
-- ----------------------------------------------------------------------------
-- Get trending keywords with inline sparkline data

create or replace function public.get_trending_with_sparklines(
    p_mission_run_id uuid,
    p_region text default 'US',
    p_limit integer default 20
)
returns table (
    keyword text,
    keyword_id uuid,
    trend_score numeric,
    current_interest smallint,
    rank_position integer,
    sparkline smallint[]
)
language sql
stable
as $$
    select
        k.keyword,
        k.id as keyword_id,
        res.trend_score,
        res.current_interest,
        res.rank_position,
        (
            select array_agg(kt.interest_value order by kt.ts)
            from (
                select interest_value, ts
                from public.keyword_timeseries
                where keyword_id = k.id
                order by ts desc
                limit 24
            ) kt
        ) as sparkline
    from public.mission_results res
    join public.keywords k on k.id = res.keyword_id
    where res.mission_run_id = p_mission_run_id
      and res.region = p_region
    order by res.rank_position
    limit p_limit;
$$;

comment on function public.get_trending_with_sparklines is
    'Get trending keywords with embedded sparkline data';


-- ----------------------------------------------------------------------------
-- 7. REGION HEATMAP DATA
-- ----------------------------------------------------------------------------
-- Interest levels by region for heatmap visualization

create or replace function public.get_region_heatmap(
    p_keyword_id uuid,
    p_source_code public.source_code default 'GOOGLE_TRENDS'
)
returns table (
    region text,
    interest_value smallint,
    normalized_value numeric  -- 0-1 scale for heatmap coloring
)
language sql
stable
as $$
    with latest_by_region as (
        select distinct on (kt.region)
            kt.region,
            kt.interest_value
        from public.keyword_timeseries kt
        join public.sources s on s.id = kt.source_id
        where kt.keyword_id = p_keyword_id
          and s.code = p_source_code
        order by kt.region, kt.ts desc
    ),
    max_val as (
        select max(interest_value) as max_interest from latest_by_region
    )
    select
        lbr.region,
        lbr.interest_value,
        round(lbr.interest_value::numeric / nullif(mv.max_interest, 0), 4) as normalized_value
    from latest_by_region lbr
    cross join max_val mv
    order by lbr.interest_value desc;
$$;

comment on function public.get_region_heatmap is
    'Get regional interest data for heatmap visualization';


-- ----------------------------------------------------------------------------
-- 8. QUICK STATS BAR
-- ----------------------------------------------------------------------------
-- Compact stats for header/footer bars

create or replace function public.get_quick_stats(
    p_workspace_id uuid
)
returns jsonb
language sql
stable
as $$
    select jsonb_build_object(
        'active_missions', (
            select count(*) from public.missions
            where workspace_id = p_workspace_id and status = 'ACTIVE'
        ),
        'running_jobs', (
            select count(*) from public.mission_runs mr
            join public.missions m on m.id = mr.mission_id
            where m.workspace_id = p_workspace_id and mr.status = 'RUNNING'
        ),
        'keywords_tracked', (
            select count(distinct res.keyword_id)
            from public.mission_results res
            join public.mission_runs mr on mr.id = res.mission_run_id
            join public.missions m on m.id = mr.mission_id
            where m.workspace_id = p_workspace_id
              and mr.completed_at >= now() - interval '24 hours'
        ),
        'last_updated', (
            select max(mr.completed_at)
            from public.mission_runs mr
            join public.missions m on m.id = mr.mission_id
            where m.workspace_id = p_workspace_id
              and mr.status = 'COMPLETED'
        )
    );
$$;

comment on function public.get_quick_stats is
    'Get compact stats as JSON for header/status bars';


-- ----------------------------------------------------------------------------
-- 9. NOTIFICATION-WORTHY EVENTS
-- ----------------------------------------------------------------------------
-- Find significant changes that might warrant alerts

create or replace function public.get_notification_events(
    p_workspace_id uuid,
    p_hours_back integer default 24
)
returns table (
    event_type text,
    event_description text,
    keyword text,
    keyword_id uuid,
    mission_name text,
    occurred_at timestamptz,
    severity text  -- 'info', 'warning', 'alert'
)
language sql
stable
as $$
    -- New keywords entering top 10
    with latest_runs as (
        select distinct on (m.id)
            m.id as mission_id,
            m.name as mission_name,
            mr.id as run_id,
            mr.completed_at
        from public.missions m
        join public.mission_runs mr on mr.mission_id = m.id
        where m.workspace_id = p_workspace_id
          and mr.status = 'COMPLETED'
          and mr.completed_at >= now() - (p_hours_back || ' hours')::interval
        order by m.id, mr.completed_at desc
    )
    select
        'NEW_TOP_10' as event_type,
        'New keyword entered top 10: ' || k.keyword as event_description,
        k.keyword,
        k.id as keyword_id,
        lr.mission_name,
        lr.completed_at as occurred_at,
        'info' as severity
    from latest_runs lr
    join public.mission_results res on res.mission_run_id = lr.run_id
    join public.keywords k on k.id = res.keyword_id
    where res.rank_position <= 10
      and res.rank_change is null  -- first appearance

    union all

    -- Big rank jumps (moved up 20+ positions)
    select
        'BIG_MOVER' as event_type,
        k.keyword || ' jumped ' || res.rank_change || ' positions' as event_description,
        k.keyword,
        k.id as keyword_id,
        lr.mission_name,
        lr.completed_at as occurred_at,
        case when res.rank_change >= 50 then 'alert' else 'warning' end as severity
    from latest_runs lr
    join public.mission_results res on res.mission_run_id = lr.run_id
    join public.keywords k on k.id = res.keyword_id
    where res.rank_change >= 20

    union all

    -- Failed runs
    select
        'RUN_FAILED' as event_type,
        'Mission run failed: ' || mr.error_message as event_description,
        null as keyword,
        null as keyword_id,
        m.name as mission_name,
        mr.started_at as occurred_at,
        'alert' as severity
    from public.mission_runs mr
    join public.missions m on m.id = mr.mission_id
    where m.workspace_id = p_workspace_id
      and mr.status = 'FAILED'
      and mr.started_at >= now() - (p_hours_back || ' hours')::interval

    order by occurred_at desc;
$$;

comment on function public.get_notification_events is
    'Find significant events that warrant user notification';
