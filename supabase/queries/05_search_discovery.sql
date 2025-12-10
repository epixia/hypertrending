-- ============================================================================
-- HYPERTRENDING.COM - Search & Discovery Queries
-- ============================================================================
-- Queries for keyword search, discovery, and exploration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FUZZY KEYWORD SEARCH
-- ----------------------------------------------------------------------------
-- Search keywords with typo tolerance using trigram similarity

create or replace function public.search_keywords(
    p_query text,
    p_limit integer default 20,
    p_min_similarity numeric default 0.3
)
returns table (
    keyword_id uuid,
    keyword text,
    similarity_score numeric,
    category text,
    total_searches bigint,
    last_seen_at timestamptz
)
language sql
stable
as $$
    select
        k.id as keyword_id,
        k.keyword,
        round(similarity(k.normalized_keyword, lower(p_query))::numeric, 3) as similarity_score,
        k.category,
        k.total_searches,
        k.last_seen_at
    from public.keywords k
    where k.normalized_keyword % lower(p_query)  -- uses trigram index
       or k.normalized_keyword ilike '%' || p_query || '%'
    order by
        similarity(k.normalized_keyword, lower(p_query)) desc,
        k.total_searches desc
    limit p_limit;
$$;

comment on function public.search_keywords is
    'Fuzzy search keywords with typo tolerance';


-- ----------------------------------------------------------------------------
-- 2. AUTOCOMPLETE SUGGESTIONS
-- ----------------------------------------------------------------------------
-- Fast prefix-based autocomplete for search box

create or replace function public.autocomplete_keywords(
    p_prefix text,
    p_limit integer default 10
)
returns table (
    keyword text,
    keyword_id uuid,
    total_searches bigint
)
language sql
stable
as $$
    select
        k.keyword,
        k.id as keyword_id,
        k.total_searches
    from public.keywords k
    where k.normalized_keyword like lower(p_prefix) || '%'
    order by k.total_searches desc, k.keyword
    limit p_limit;
$$;

comment on function public.autocomplete_keywords is
    'Fast prefix-based autocomplete for search';


-- ----------------------------------------------------------------------------
-- 3. RELATED KEYWORDS
-- ----------------------------------------------------------------------------
-- Find keywords that trend together or are semantically related

create or replace function public.get_related_keywords(
    p_keyword_id uuid,
    p_limit integer default 15
)
returns table (
    keyword_id uuid,
    keyword text,
    relation_type text,  -- 'co_trending', 'suggested', 'similar'
    relevance_score numeric
)
language sql
stable
as $$
    -- Keywords that appeared in the same mission results (co-trending)
    with co_trending as (
        select
            r2.keyword_id,
            count(*) as co_occurrence,
            'co_trending' as relation_type
        from public.mission_results r1
        join public.mission_results r2
            on r2.mission_run_id = r1.mission_run_id
            and r2.keyword_id != r1.keyword_id
        where r1.keyword_id = p_keyword_id
        group by r2.keyword_id
        order by count(*) desc
        limit p_limit
    ),
    -- Keywords from related_keywords arrays
    suggested as (
        select
            k.id as keyword_id,
            'suggested' as relation_type
        from public.mission_results r
        cross join lateral unnest(r.related_keywords) as rk(related)
        join public.keywords k on k.normalized_keyword = lower(rk.related)
        where r.keyword_id = p_keyword_id
        group by k.id
        limit p_limit
    ),
    -- Similar by name (trigram)
    similar as (
        select
            k2.id as keyword_id,
            similarity(k1.normalized_keyword, k2.normalized_keyword) as sim,
            'similar' as relation_type
        from public.keywords k1
        cross join public.keywords k2
        where k1.id = p_keyword_id
          and k2.id != p_keyword_id
          and k1.normalized_keyword % k2.normalized_keyword
        order by similarity(k1.normalized_keyword, k2.normalized_keyword) desc
        limit p_limit
    )
    select
        k.id as keyword_id,
        k.keyword,
        ct.relation_type,
        ct.co_occurrence::numeric / 10 as relevance_score
    from co_trending ct
    join public.keywords k on k.id = ct.keyword_id

    union

    select
        k.id as keyword_id,
        k.keyword,
        s.relation_type,
        5.0 as relevance_score  -- fixed score for suggested
    from suggested s
    join public.keywords k on k.id = s.keyword_id

    union

    select
        k.id as keyword_id,
        k.keyword,
        sim.relation_type,
        sim.sim * 10 as relevance_score
    from similar sim
    join public.keywords k on k.id = sim.keyword_id

    order by relevance_score desc
    limit p_limit;
$$;

comment on function public.get_related_keywords is
    'Find keywords related by co-trending, suggestions, or similarity';


-- ----------------------------------------------------------------------------
-- 4. DISCOVER EMERGING KEYWORDS
-- ----------------------------------------------------------------------------
-- Find keywords that are just starting to trend (early signals)

create or replace function public.discover_emerging(
    p_workspace_id uuid,
    p_hours_back integer default 48,
    p_limit integer default 30
)
returns table (
    keyword text,
    keyword_id uuid,
    first_seen_hours_ago numeric,
    current_rank integer,
    trend_score numeric,
    source_name text,
    region text
)
language sql
stable
as $$
    with recent_runs as (
        select
            mr.id as run_id,
            mr.completed_at,
            m.name as mission_name
        from public.mission_runs mr
        join public.missions m on m.id = mr.mission_id
        where m.workspace_id = p_workspace_id
          and mr.status = 'COMPLETED'
          and mr.completed_at >= now() - (p_hours_back || ' hours')::interval
    ),
    first_appearances as (
        select
            res.keyword_id,
            min(rr.completed_at) as first_seen,
            min(res.rank_position) as best_rank
        from public.mission_results res
        join recent_runs rr on rr.run_id = res.mission_run_id
        group by res.keyword_id
        having min(rr.completed_at) >= now() - (p_hours_back || ' hours')::interval
    )
    select
        k.keyword,
        k.id as keyword_id,
        round(extract(epoch from (now() - fa.first_seen)) / 3600, 1) as first_seen_hours_ago,
        res.rank_position as current_rank,
        res.trend_score,
        s.name as source_name,
        res.region
    from first_appearances fa
    join public.keywords k on k.id = fa.keyword_id
    join public.mission_results res on res.keyword_id = fa.keyword_id
    join public.sources s on s.id = res.source_id
    join recent_runs rr on rr.run_id = res.mission_run_id
    where res.mission_run_id = (
        select run_id from recent_runs order by completed_at desc limit 1
    )
    order by res.trend_score desc
    limit p_limit;
$$;

comment on function public.discover_emerging is
    'Discover newly emerging trending keywords';


-- ----------------------------------------------------------------------------
-- 5. BROWSE BY CATEGORY
-- ----------------------------------------------------------------------------
-- Browse trending keywords organized by category

create or replace function public.browse_by_category(
    p_mission_run_id uuid,
    p_region text default null
)
returns table (
    category text,
    keyword_count bigint,
    top_keyword text,
    avg_trend_score numeric,
    max_trend_score numeric
)
language sql
stable
as $$
    select
        coalesce(k.category, 'Uncategorized') as category,
        count(*) as keyword_count,
        (
            select k2.keyword
            from public.mission_results r2
            join public.keywords k2 on k2.id = r2.keyword_id
            where r2.mission_run_id = p_mission_run_id
              and coalesce(k2.category, 'Uncategorized') = coalesce(k.category, 'Uncategorized')
              and (p_region is null or r2.region = p_region)
            order by r2.trend_score desc
            limit 1
        ) as top_keyword,
        round(avg(res.trend_score), 2) as avg_trend_score,
        max(res.trend_score) as max_trend_score
    from public.mission_results res
    join public.keywords k on k.id = res.keyword_id
    where res.mission_run_id = p_mission_run_id
      and (p_region is null or res.region = p_region)
    group by coalesce(k.category, 'Uncategorized')
    order by count(*) desc;
$$;

comment on function public.browse_by_category is
    'Browse trending keywords grouped by category';


-- ----------------------------------------------------------------------------
-- 6. KEYWORD DETAIL PAGE
-- ----------------------------------------------------------------------------
-- All information needed for a keyword detail page

create or replace function public.get_keyword_detail(
    p_keyword_id uuid,
    p_workspace_id uuid default null
)
returns jsonb
language sql
stable
as $$
    select jsonb_build_object(
        'keyword', (
            select jsonb_build_object(
                'id', k.id,
                'keyword', k.keyword,
                'category', k.category,
                'language', k.language,
                'first_seen_at', k.first_seen_at,
                'last_seen_at', k.last_seen_at,
                'total_searches', k.total_searches,
                'metadata', k.metadata
            )
            from public.keywords k
            where k.id = p_keyword_id
        ),
        'latest_metrics', (
            select jsonb_agg(jsonb_build_object(
                'source', s.name,
                'region', res.region,
                'time_window', res.time_window,
                'trend_score', res.trend_score,
                'current_interest', res.current_interest,
                'baseline_interest', res.baseline_interest,
                'rank_position', res.rank_position,
                'rank_change', res.rank_change
            ) order by res.trend_score desc)
            from public.mission_results res
            join public.sources s on s.id = res.source_id
            join public.mission_runs mr on mr.id = res.mission_run_id
            where res.keyword_id = p_keyword_id
              and mr.status = 'COMPLETED'
              and mr.completed_at = (
                  select max(mr2.completed_at)
                  from public.mission_runs mr2
                  join public.mission_results res2 on res2.mission_run_id = mr2.id
                  where res2.keyword_id = p_keyword_id
                    and mr2.status = 'COMPLETED'
              )
        ),
        'regions', (
            select jsonb_agg(distinct res.region)
            from public.mission_results res
            where res.keyword_id = p_keyword_id
        ),
        'related_keywords', (
            select jsonb_agg(distinct rk)
            from public.mission_results res
            cross join lateral unnest(res.related_keywords) as rk
            where res.keyword_id = p_keyword_id
            limit 20
        ),
        'appearance_count', (
            select count(distinct mission_run_id)
            from public.mission_results
            where keyword_id = p_keyword_id
        )
    );
$$;

comment on function public.get_keyword_detail is
    'Get all details for a keyword page as JSON';


-- ----------------------------------------------------------------------------
-- 7. TRENDING IN REGION
-- ----------------------------------------------------------------------------
-- Explore what's trending in a specific region

create or replace function public.get_trending_in_region(
    p_region text,
    p_workspace_id uuid,
    p_limit integer default 50
)
returns table (
    keyword text,
    keyword_id uuid,
    trend_score numeric,
    current_interest smallint,
    source_name text,
    category text,
    rank_position integer
)
language sql
stable
as $$
    with latest_run as (
        select mr.id
        from public.mission_runs mr
        join public.missions m on m.id = mr.mission_id
        where m.workspace_id = p_workspace_id
          and mr.status = 'COMPLETED'
        order by mr.completed_at desc
        limit 1
    )
    select
        k.keyword,
        k.id as keyword_id,
        res.trend_score,
        res.current_interest,
        s.name as source_name,
        k.category,
        res.rank_position
    from latest_run lr
    join public.mission_results res on res.mission_run_id = lr.id
    join public.keywords k on k.id = res.keyword_id
    join public.sources s on s.id = res.source_id
    where res.region = p_region
    order by res.rank_position
    limit p_limit;
$$;

comment on function public.get_trending_in_region is
    'Get trending keywords for a specific region';


-- ----------------------------------------------------------------------------
-- 8. EXPLORE BY TIME WINDOW
-- ----------------------------------------------------------------------------
-- Compare trends across different time windows

create or replace function public.explore_by_time_window(
    p_mission_run_id uuid,
    p_region text default 'US'
)
returns table (
    time_window public.time_window,
    keyword_count bigint,
    avg_trend_score numeric,
    top_keywords jsonb
)
language sql
stable
as $$
    select
        res.time_window,
        count(*) as keyword_count,
        round(avg(res.trend_score), 2) as avg_trend_score,
        (
            select jsonb_agg(jsonb_build_object(
                'keyword', k.keyword,
                'trend_score', r.trend_score
            ) order by r.trend_score desc)
            from (
                select keyword_id, trend_score
                from public.mission_results
                where mission_run_id = p_mission_run_id
                  and region = p_region
                  and time_window = res.time_window
                order by trend_score desc
                limit 5
            ) r
            join public.keywords k on k.id = r.keyword_id
        ) as top_keywords
    from public.mission_results res
    where res.mission_run_id = p_mission_run_id
      and res.region = p_region
    group by res.time_window
    order by res.time_window;
$$;

comment on function public.explore_by_time_window is
    'Explore trends across different time windows';


-- ----------------------------------------------------------------------------
-- 9. KEYWORD HISTORY IN MISSIONS
-- ----------------------------------------------------------------------------
-- Track when a keyword appeared across different missions

create or replace function public.get_keyword_mission_history(
    p_keyword_id uuid,
    p_workspace_id uuid,
    p_limit integer default 50
)
returns table (
    mission_name text,
    mission_id uuid,
    run_number integer,
    run_completed_at timestamptz,
    rank_position integer,
    trend_score numeric,
    region text,
    time_window public.time_window
)
language sql
stable
as $$
    select
        m.name as mission_name,
        m.id as mission_id,
        mr.run_number,
        mr.completed_at as run_completed_at,
        res.rank_position,
        res.trend_score,
        res.region,
        res.time_window
    from public.mission_results res
    join public.mission_runs mr on mr.id = res.mission_run_id
    join public.missions m on m.id = mr.mission_id
    where res.keyword_id = p_keyword_id
      and m.workspace_id = p_workspace_id
      and mr.status = 'COMPLETED'
    order by mr.completed_at desc
    limit p_limit;
$$;

comment on function public.get_keyword_mission_history is
    'Track keyword appearances across missions';


-- ----------------------------------------------------------------------------
-- 10. GLOBAL SEARCH (Cross-entity)
-- ----------------------------------------------------------------------------
-- Search across keywords, missions, and more

create or replace function public.global_search(
    p_query text,
    p_workspace_id uuid,
    p_limit integer default 20
)
returns table (
    entity_type text,
    entity_id uuid,
    title text,
    subtitle text,
    relevance numeric
)
language sql
stable
as $$
    -- Search keywords
    select
        'keyword' as entity_type,
        k.id as entity_id,
        k.keyword as title,
        coalesce(k.category, 'Keyword') as subtitle,
        similarity(k.normalized_keyword, lower(p_query))::numeric as relevance
    from public.keywords k
    where k.normalized_keyword % lower(p_query)

    union all

    -- Search missions
    select
        'mission' as entity_type,
        m.id as entity_id,
        m.name as title,
        m.status::text as subtitle,
        similarity(lower(m.name), lower(p_query))::numeric as relevance
    from public.missions m
    where m.workspace_id = p_workspace_id
      and (lower(m.name) % lower(p_query) or m.name ilike '%' || p_query || '%')

    order by relevance desc
    limit p_limit;
$$;

comment on function public.global_search is
    'Search across keywords, missions, and other entities';
