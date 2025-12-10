-- ============================================================================
-- HYPERTRENDING.COM - Trend History & Comparison Queries
-- ============================================================================
-- Queries for time-series analysis, trend comparison, and historical data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. KEYWORD INTEREST TIMESERIES (For Charts)
-- ----------------------------------------------------------------------------
-- Get interest values over time for chart rendering

create or replace function public.get_interest_chart_data(
    p_keyword_id uuid,
    p_source_code public.source_code default 'GOOGLE_TRENDS',
    p_region text default 'US',
    p_granularity public.time_granularity default 'hour',
    p_hours_back integer default 168  -- 7 days
)
returns table (
    ts timestamptz,
    interest_value smallint,
    is_partial boolean
)
language sql
stable
as $$
    select
        kt.ts,
        kt.interest_value,
        kt.is_partial
    from public.keyword_timeseries kt
    join public.sources s on s.id = kt.source_id
    where kt.keyword_id = p_keyword_id
      and s.code = p_source_code
      and kt.region = p_region
      and kt.granularity = p_granularity
      and kt.ts >= now() - (p_hours_back || ' hours')::interval
    order by kt.ts asc;
$$;

comment on function public.get_interest_chart_data is
    'Get timeseries data for rendering trend charts';


-- ----------------------------------------------------------------------------
-- 2. MULTI-KEYWORD COMPARISON CHART
-- ----------------------------------------------------------------------------
-- Compare multiple keywords on the same chart

create or replace function public.get_comparison_chart_data(
    p_keyword_ids uuid[],
    p_source_code public.source_code default 'GOOGLE_TRENDS',
    p_region text default 'US',
    p_granularity public.time_granularity default 'day',
    p_days_back integer default 30
)
returns table (
    keyword_id uuid,
    keyword text,
    ts timestamptz,
    interest_value smallint
)
language sql
stable
as $$
    select
        kt.keyword_id,
        k.keyword,
        kt.ts,
        kt.interest_value
    from public.keyword_timeseries kt
    join public.keywords k on k.id = kt.keyword_id
    join public.sources s on s.id = kt.source_id
    where kt.keyword_id = any(p_keyword_ids)
      and s.code = p_source_code
      and kt.region = p_region
      and kt.granularity = p_granularity
      and kt.ts >= now() - (p_days_back || ' days')::interval
    order by kt.keyword_id, kt.ts asc;
$$;

comment on function public.get_comparison_chart_data is
    'Get timeseries data for comparing multiple keywords';


-- ----------------------------------------------------------------------------
-- 3. TREND VELOCITY (Rate of Change)
-- ----------------------------------------------------------------------------
-- Calculate how fast a keyword's interest is changing

create or replace function public.get_trend_velocity(
    p_keyword_id uuid,
    p_source_code public.source_code default 'GOOGLE_TRENDS',
    p_region text default 'US',
    p_window_hours integer default 24
)
returns table (
    current_value smallint,
    previous_value smallint,
    absolute_change integer,
    percent_change numeric,
    velocity_per_hour numeric,
    trend_direction text
)
language sql
stable
as $$
    with recent_data as (
        select
            kt.ts,
            kt.interest_value,
            row_number() over (order by kt.ts desc) as rn
        from public.keyword_timeseries kt
        join public.sources s on s.id = kt.source_id
        where kt.keyword_id = p_keyword_id
          and s.code = p_source_code
          and kt.region = p_region
          and kt.ts >= now() - (p_window_hours || ' hours')::interval
    ),
    bounds as (
        select
            max(case when rn = 1 then interest_value end) as current_val,
            max(case when rn = (select max(rn) from recent_data) then interest_value end) as previous_val,
            max(case when rn = 1 then ts end) as current_ts,
            max(case when rn = (select max(rn) from recent_data) then ts end) as previous_ts
        from recent_data
    )
    select
        current_val::smallint as current_value,
        previous_val::smallint as previous_value,
        (current_val - previous_val)::integer as absolute_change,
        case
            when previous_val = 0 then null
            else round(((current_val - previous_val)::numeric / previous_val) * 100, 2)
        end as percent_change,
        case
            when extract(epoch from (current_ts - previous_ts)) = 0 then null
            else round(
                (current_val - previous_val)::numeric /
                (extract(epoch from (current_ts - previous_ts)) / 3600),
                4
            )
        end as velocity_per_hour,
        case
            when current_val > previous_val then 'RISING'
            when current_val < previous_val then 'FALLING'
            else 'STABLE'
        end as trend_direction
    from bounds;
$$;

comment on function public.get_trend_velocity is
    'Calculate rate of change for a keyword''s trend';


-- ----------------------------------------------------------------------------
-- 4. MOVING AVERAGES
-- ----------------------------------------------------------------------------
-- Get interest values with moving averages for smoothing

create or replace function public.get_interest_with_moving_avg(
    p_keyword_id uuid,
    p_source_code public.source_code default 'GOOGLE_TRENDS',
    p_region text default 'US',
    p_granularity public.time_granularity default 'hour',
    p_days_back integer default 7,
    p_ma_periods integer default 6  -- moving average window
)
returns table (
    ts timestamptz,
    interest_value smallint,
    ma_value numeric,
    deviation_from_ma numeric
)
language sql
stable
as $$
    select
        ts,
        interest_value,
        round(avg(interest_value) over (
            order by ts
            rows between p_ma_periods - 1 preceding and current row
        ), 2) as ma_value,
        round(
            interest_value - avg(interest_value) over (
                order by ts
                rows between p_ma_periods - 1 preceding and current row
            ),
            2
        ) as deviation_from_ma
    from public.keyword_timeseries kt
    join public.sources s on s.id = kt.source_id
    where kt.keyword_id = p_keyword_id
      and s.code = p_source_code
      and kt.region = p_region
      and kt.granularity = p_granularity
      and kt.ts >= now() - (p_days_back || ' days')::interval
    order by ts;
$$;

comment on function public.get_interest_with_moving_avg is
    'Get timeseries with moving average for trend smoothing';


-- ----------------------------------------------------------------------------
-- 5. PERIOD-OVER-PERIOD COMPARISON
-- ----------------------------------------------------------------------------
-- Compare current period vs previous period (e.g., this week vs last week)

create or replace function public.get_period_comparison(
    p_keyword_id uuid,
    p_source_code public.source_code default 'GOOGLE_TRENDS',
    p_region text default 'US',
    p_period_days integer default 7
)
returns table (
    metric text,
    current_period numeric,
    previous_period numeric,
    change_value numeric,
    change_percent numeric
)
language sql
stable
as $$
    with current_period as (
        select
            avg(kt.interest_value) as avg_interest,
            max(kt.interest_value) as max_interest,
            min(kt.interest_value) as min_interest,
            count(*) as data_points
        from public.keyword_timeseries kt
        join public.sources s on s.id = kt.source_id
        where kt.keyword_id = p_keyword_id
          and s.code = p_source_code
          and kt.region = p_region
          and kt.ts >= now() - (p_period_days || ' days')::interval
    ),
    previous_period as (
        select
            avg(kt.interest_value) as avg_interest,
            max(kt.interest_value) as max_interest,
            min(kt.interest_value) as min_interest,
            count(*) as data_points
        from public.keyword_timeseries kt
        join public.sources s on s.id = kt.source_id
        where kt.keyword_id = p_keyword_id
          and s.code = p_source_code
          and kt.region = p_region
          and kt.ts >= now() - (p_period_days * 2 || ' days')::interval
          and kt.ts < now() - (p_period_days || ' days')::interval
    )
    select * from (
        select
            'average_interest' as metric,
            round(c.avg_interest, 2) as current_period,
            round(p.avg_interest, 2) as previous_period,
            round(c.avg_interest - p.avg_interest, 2) as change_value,
            case when p.avg_interest = 0 then null
                 else round(((c.avg_interest - p.avg_interest) / p.avg_interest) * 100, 2)
            end as change_percent
        from current_period c, previous_period p
        union all
        select
            'max_interest',
            c.max_interest,
            p.max_interest,
            c.max_interest - p.max_interest,
            case when p.max_interest = 0 then null
                 else round(((c.max_interest - p.max_interest)::numeric / p.max_interest) * 100, 2)
            end
        from current_period c, previous_period p
        union all
        select
            'min_interest',
            c.min_interest,
            p.min_interest,
            c.min_interest - p.min_interest,
            case when p.min_interest = 0 then null
                 else round(((c.min_interest - p.min_interest)::numeric / p.min_interest) * 100, 2)
            end
        from current_period c, previous_period p
    ) t;
$$;

comment on function public.get_period_comparison is
    'Compare keyword metrics between current and previous period';


-- ----------------------------------------------------------------------------
-- 6. PEAK DETECTION
-- ----------------------------------------------------------------------------
-- Find interest peaks (local maxima) in the timeseries

create or replace function public.get_interest_peaks(
    p_keyword_id uuid,
    p_source_code public.source_code default 'GOOGLE_TRENDS',
    p_region text default 'US',
    p_days_back integer default 30,
    p_min_prominence integer default 10  -- minimum peak height above neighbors
)
returns table (
    peak_ts timestamptz,
    peak_value smallint,
    prominence integer,
    days_ago numeric
)
language sql
stable
as $$
    with data as (
        select
            kt.ts,
            kt.interest_value as val,
            lag(kt.interest_value) over (order by kt.ts) as prev_val,
            lead(kt.interest_value) over (order by kt.ts) as next_val
        from public.keyword_timeseries kt
        join public.sources s on s.id = kt.source_id
        where kt.keyword_id = p_keyword_id
          and s.code = p_source_code
          and kt.region = p_region
          and kt.ts >= now() - (p_days_back || ' days')::interval
    )
    select
        ts as peak_ts,
        val as peak_value,
        least(val - coalesce(prev_val, 0), val - coalesce(next_val, 0))::integer as prominence,
        round(extract(epoch from (now() - ts)) / 86400, 1) as days_ago
    from data
    where val > coalesce(prev_val, 0)
      and val > coalesce(next_val, 0)
      and least(val - coalesce(prev_val, 0), val - coalesce(next_val, 0)) >= p_min_prominence
    order by val desc;
$$;

comment on function public.get_interest_peaks is
    'Detect interest peaks (local maxima) in keyword timeseries';


-- ----------------------------------------------------------------------------
-- 7. SEASONALITY DETECTION (Day-of-Week Pattern)
-- ----------------------------------------------------------------------------
-- Analyze if keyword has day-of-week patterns

create or replace function public.get_dow_pattern(
    p_keyword_id uuid,
    p_source_code public.source_code default 'GOOGLE_TRENDS',
    p_region text default 'US',
    p_weeks_back integer default 12
)
returns table (
    day_of_week integer,
    day_name text,
    avg_interest numeric,
    interest_index numeric,  -- relative to overall average (100 = average)
    sample_count bigint
)
language sql
stable
as $$
    with daily_data as (
        select
            extract(dow from kt.ts)::integer as dow,
            kt.interest_value
        from public.keyword_timeseries kt
        join public.sources s on s.id = kt.source_id
        where kt.keyword_id = p_keyword_id
          and s.code = p_source_code
          and kt.region = p_region
          and kt.granularity = 'day'
          and kt.ts >= now() - (p_weeks_back * 7 || ' days')::interval
    ),
    overall_avg as (
        select avg(interest_value) as avg_val from daily_data
    )
    select
        d.dow as day_of_week,
        case d.dow
            when 0 then 'Sunday'
            when 1 then 'Monday'
            when 2 then 'Tuesday'
            when 3 then 'Wednesday'
            when 4 then 'Thursday'
            when 5 then 'Friday'
            when 6 then 'Saturday'
        end as day_name,
        round(avg(d.interest_value), 2) as avg_interest,
        round((avg(d.interest_value) / o.avg_val) * 100, 2) as interest_index,
        count(*) as sample_count
    from daily_data d, overall_avg o
    group by d.dow, o.avg_val
    order by d.dow;
$$;

comment on function public.get_dow_pattern is
    'Analyze day-of-week interest patterns for a keyword';


-- ----------------------------------------------------------------------------
-- 8. CORRELATION BETWEEN KEYWORDS
-- ----------------------------------------------------------------------------
-- Check if two keywords trend together

create or replace function public.get_keyword_correlation(
    p_keyword_id_1 uuid,
    p_keyword_id_2 uuid,
    p_source_code public.source_code default 'GOOGLE_TRENDS',
    p_region text default 'US',
    p_days_back integer default 30
)
returns table (
    keyword_1 text,
    keyword_2 text,
    correlation_coefficient numeric,
    data_points bigint,
    interpretation text
)
language sql
stable
as $$
    with aligned_data as (
        select
            kt1.ts,
            kt1.interest_value as val1,
            kt2.interest_value as val2
        from public.keyword_timeseries kt1
        join public.keyword_timeseries kt2
            on kt2.ts = kt1.ts
            and kt2.region = kt1.region
            and kt2.source_id = kt1.source_id
            and kt2.granularity = kt1.granularity
        join public.sources s on s.id = kt1.source_id
        where kt1.keyword_id = p_keyword_id_1
          and kt2.keyword_id = p_keyword_id_2
          and s.code = p_source_code
          and kt1.region = p_region
          and kt1.ts >= now() - (p_days_back || ' days')::interval
    ),
    stats as (
        select
            count(*) as n,
            avg(val1) as avg1,
            avg(val2) as avg2,
            stddev_pop(val1) as std1,
            stddev_pop(val2) as std2,
            sum((val1 - (select avg(val1) from aligned_data)) *
                (val2 - (select avg(val2) from aligned_data))) as covariance_sum
        from aligned_data
    )
    select
        k1.keyword as keyword_1,
        k2.keyword as keyword_2,
        case
            when s.std1 = 0 or s.std2 = 0 then 0
            else round((s.covariance_sum / s.n) / (s.std1 * s.std2), 4)
        end as correlation_coefficient,
        s.n as data_points,
        case
            when s.std1 = 0 or s.std2 = 0 then 'No variation'
            when abs((s.covariance_sum / s.n) / (s.std1 * s.std2)) >= 0.7 then 'Strong correlation'
            when abs((s.covariance_sum / s.n) / (s.std1 * s.std2)) >= 0.4 then 'Moderate correlation'
            when abs((s.covariance_sum / s.n) / (s.std1 * s.std2)) >= 0.2 then 'Weak correlation'
            else 'No correlation'
        end as interpretation
    from stats s
    cross join public.keywords k1
    cross join public.keywords k2
    where k1.id = p_keyword_id_1
      and k2.id = p_keyword_id_2;
$$;

comment on function public.get_keyword_correlation is
    'Calculate correlation coefficient between two keywords'' trends';


-- ----------------------------------------------------------------------------
-- 9. TREND CONSISTENCY SCORE
-- ----------------------------------------------------------------------------
-- How consistently has the keyword been trending (vs sporadic spikes)?

create or replace function public.get_trend_consistency(
    p_keyword_id uuid,
    p_source_code public.source_code default 'GOOGLE_TRENDS',
    p_region text default 'US',
    p_days_back integer default 30
)
returns table (
    keyword text,
    avg_interest numeric,
    std_deviation numeric,
    coefficient_of_variation numeric,  -- lower = more consistent
    consistency_score numeric,          -- 0-100, higher = more consistent
    data_points bigint
)
language sql
stable
as $$
    with data as (
        select kt.interest_value
        from public.keyword_timeseries kt
        join public.sources s on s.id = kt.source_id
        where kt.keyword_id = p_keyword_id
          and s.code = p_source_code
          and kt.region = p_region
          and kt.ts >= now() - (p_days_back || ' days')::interval
    ),
    stats as (
        select
            avg(interest_value) as avg_val,
            stddev_pop(interest_value) as std_val,
            count(*) as n
        from data
    )
    select
        k.keyword,
        round(s.avg_val, 2) as avg_interest,
        round(s.std_val, 2) as std_deviation,
        case when s.avg_val = 0 then null
             else round((s.std_val / s.avg_val) * 100, 2)
        end as coefficient_of_variation,
        case when s.avg_val = 0 then 0
             else round(greatest(0, 100 - (s.std_val / s.avg_val) * 100), 2)
        end as consistency_score,
        s.n as data_points
    from stats s
    cross join public.keywords k
    where k.id = p_keyword_id;
$$;

comment on function public.get_trend_consistency is
    'Measure how consistently a keyword trends (vs sporadic spikes)';
