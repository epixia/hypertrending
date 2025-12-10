-- ============================================================================
-- HYPERTRENDING.COM - Full Schema Deployment
-- ============================================================================
-- Combined migration file for Supabase SQL Editor deployment.
-- Copy and paste this entire file into the SQL Editor at:
-- https://supabase.com/dashboard/project/nvjorsmbjckaaodvlssl/sql
-- ============================================================================

-- ============================================================================
-- PART 1: EXTENSIONS & TYPES
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- Workspace member roles
do $$ begin
    create type public.workspace_role as enum ('owner', 'admin', 'member', 'viewer');
exception when duplicate_object then null;
end $$;

-- Mission status
do $$ begin
    create type public.mission_status as enum ('ACTIVE', 'INACTIVE', 'ARCHIVED');
exception when duplicate_object then null;
end $$;

-- Mission run status
do $$ begin
    create type public.run_status as enum ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
exception when duplicate_object then null;
end $$;

-- Time granularity for timeseries data
do $$ begin
    create type public.time_granularity as enum ('minute', 'hour', 'day', 'week');
exception when duplicate_object then null;
end $$;

-- Time window for trend analysis
do $$ begin
    create type public.time_window as enum ('1h', '4h', '24h', '7d', '30d', '90d');
exception when duplicate_object then null;
end $$;

-- Data source codes
do $$ begin
    create type public.source_code as enum (
        'GOOGLE_TRENDS',
        'YOUTUBE',
        'X',
        'REDDIT',
        'TIKTOK',
        'GOOGLE_NEWS',
        'CUSTOM'
    );
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- PART 2: TABLES
-- ============================================================================

-- Workspaces
create table if not exists public.workspaces (
    id              uuid primary key default gen_random_uuid(),
    owner_id        uuid not null references auth.users (id) on delete cascade,
    name            text not null,
    slug            text not null unique,
    settings        jsonb not null default '{}',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    constraint workspaces_name_length check (char_length(name) between 1 and 100),
    constraint workspaces_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')
);

-- Workspace members
create table if not exists public.workspace_members (
    id              uuid primary key default gen_random_uuid(),
    workspace_id    uuid not null references public.workspaces (id) on delete cascade,
    user_id         uuid not null references auth.users (id) on delete cascade,
    role            public.workspace_role not null default 'member',
    invited_by      uuid references auth.users (id) on delete set null,
    invited_at      timestamptz,
    joined_at       timestamptz not null default now(),
    created_at      timestamptz not null default now(),
    constraint workspace_members_unique unique (workspace_id, user_id)
);

-- Sources
create table if not exists public.sources (
    id              uuid primary key default gen_random_uuid(),
    code            public.source_code not null unique,
    name            text not null,
    description     text,
    base_url        text,
    is_active       boolean not null default true,
    rate_limits     jsonb,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- Keywords
create table if not exists public.keywords (
    id                  uuid primary key default gen_random_uuid(),
    keyword             text not null,
    normalized_keyword  text generated always as (lower(trim(keyword))) stored,
    language            text default 'en',
    category            text,
    first_seen_at       timestamptz not null default now(),
    last_seen_at        timestamptz not null default now(),
    total_searches      bigint not null default 0,
    metadata            jsonb,
    created_at          timestamptz not null default now(),
    constraint keywords_keyword_length check (char_length(keyword) between 1 and 500),
    constraint keywords_normalized_unique unique (normalized_keyword, language)
);

-- Keyword timeseries
create table if not exists public.keyword_timeseries (
    id                  bigint generated always as identity primary key,
    keyword_id          uuid not null references public.keywords (id) on delete cascade,
    source_id           uuid not null references public.sources (id) on delete cascade,
    region              text not null default 'GLOBAL',
    granularity         public.time_granularity not null,
    ts                  timestamptz not null,
    interest_value      smallint not null,
    sample_size         integer,
    is_partial          boolean not null default false,
    metadata            jsonb,
    created_at          timestamptz not null default now(),
    constraint keyword_timeseries_interest_range check (interest_value between 0 and 100),
    constraint keyword_timeseries_unique unique (keyword_id, source_id, region, granularity, ts)
);

-- Missions
create table if not exists public.missions (
    id              uuid primary key default gen_random_uuid(),
    workspace_id    uuid not null references public.workspaces (id) on delete cascade,
    name            text not null,
    description     text,
    status          public.mission_status not null default 'ACTIVE',
    config          jsonb not null default '{}',
    schedule_cron   text,
    next_run_at     timestamptz,
    total_runs      integer not null default 0,
    last_run_at     timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    created_by      uuid references auth.users (id) on delete set null,
    constraint missions_name_length check (char_length(name) between 1 and 200)
);

-- Mission runs
create table if not exists public.mission_runs (
    id              uuid primary key default gen_random_uuid(),
    mission_id      uuid not null references public.missions (id) on delete cascade,
    run_number      integer not null,
    status          public.run_status not null default 'PENDING',
    scheduled_at    timestamptz,
    started_at      timestamptz,
    completed_at    timestamptz,
    duration_ms     integer,
    keywords_scanned    integer not null default 0,
    keywords_matched    integer not null default 0,
    error_code      text,
    error_message   text,
    retry_count     integer not null default 0,
    stats           jsonb,
    created_at      timestamptz not null default now(),
    triggered_by    uuid references auth.users (id) on delete set null,
    constraint mission_runs_unique_number unique (mission_id, run_number)
);

-- Mission results
create table if not exists public.mission_results (
    id                  bigint generated always as identity primary key,
    mission_run_id      uuid not null references public.mission_runs (id) on delete cascade,
    keyword_id          uuid not null references public.keywords (id) on delete cascade,
    source_id           uuid not null references public.sources (id) on delete cascade,
    region              text not null,
    time_window         public.time_window not null,
    current_interest    smallint not null,
    baseline_interest   smallint not null,
    peak_interest       smallint,
    trend_score         numeric(10,4) not null,
    volume_score        numeric(10,4),
    velocity_score      numeric(10,4),
    rank_position       integer not null,
    rank_change         integer,
    related_keywords    text[],
    metrics             jsonb,
    created_at          timestamptz not null default now(),
    constraint mission_results_interest_range check (
        current_interest between 0 and 100
        and baseline_interest between 0 and 100
        and (peak_interest is null or peak_interest between 0 and 100)
    ),
    constraint mission_results_unique unique (mission_run_id, keyword_id, source_id, region, time_window)
);

-- API keys
create table if not exists public.api_keys (
    id              uuid primary key default gen_random_uuid(),
    workspace_id    uuid not null references public.workspaces (id) on delete cascade,
    name            text not null,
    key_hash        text not null,
    key_prefix      text not null,
    permissions     text[] not null default array['read'],
    last_used_at    timestamptz,
    expires_at      timestamptz,
    is_active       boolean not null default true,
    created_at      timestamptz not null default now(),
    created_by      uuid references auth.users (id) on delete set null,
    constraint api_keys_name_length check (char_length(name) between 1 and 100)
);

-- ============================================================================
-- PART 3: INDEXES
-- ============================================================================

-- Workspaces
create index if not exists idx_workspaces_owner on public.workspaces (owner_id);
create index if not exists idx_workspaces_slug on public.workspaces (slug);

-- Workspace members
create index if not exists idx_workspace_members_user on public.workspace_members (user_id);
create index if not exists idx_workspace_members_workspace_role on public.workspace_members (workspace_id, role);

-- Keywords
create index if not exists idx_keywords_trgm on public.keywords using gin (normalized_keyword gin_trgm_ops);
create index if not exists idx_keywords_language on public.keywords (language);
create index if not exists idx_keywords_category on public.keywords (category) where category is not null;
create index if not exists idx_keywords_last_seen on public.keywords (last_seen_at desc);
create index if not exists idx_keywords_normalized_lang on public.keywords (normalized_keyword, language);

-- Keyword timeseries
create index if not exists idx_timeseries_keyword_region_ts on public.keyword_timeseries (keyword_id, region, ts desc);
create index if not exists idx_timeseries_source_ts on public.keyword_timeseries (source_id, ts desc);
create index if not exists idx_timeseries_granularity_ts on public.keyword_timeseries (granularity, ts desc);
create index if not exists idx_timeseries_keyword_source_ts on public.keyword_timeseries (keyword_id, source_id, ts desc);

-- Missions
create index if not exists idx_missions_workspace on public.missions (workspace_id);
create index if not exists idx_missions_status on public.missions (status) where status = 'ACTIVE';
create index if not exists idx_missions_next_run on public.missions (next_run_at) where status = 'ACTIVE' and next_run_at is not null;
create index if not exists idx_missions_workspace_status on public.missions (workspace_id, status);

-- Mission runs
create index if not exists idx_mission_runs_mission on public.mission_runs (mission_id);
create index if not exists idx_mission_runs_status on public.mission_runs (status) where status in ('PENDING', 'RUNNING');
create index if not exists idx_mission_runs_started on public.mission_runs (started_at desc) where started_at is not null;
create index if not exists idx_mission_runs_mission_status on public.mission_runs (mission_id, status, started_at desc);
create index if not exists idx_mission_runs_failed on public.mission_runs (mission_id, created_at desc) where status = 'FAILED';

-- Mission results
create index if not exists idx_mission_results_run on public.mission_results (mission_run_id);
create index if not exists idx_mission_results_run_score on public.mission_results (mission_run_id, trend_score desc);
create index if not exists idx_mission_results_run_rank on public.mission_results (mission_run_id, rank_position);
create index if not exists idx_mission_results_run_region on public.mission_results (mission_run_id, region);
create index if not exists idx_mission_results_run_window on public.mission_results (mission_run_id, time_window);
create index if not exists idx_mission_results_keyword on public.mission_results (keyword_id, created_at desc);
create index if not exists idx_mission_results_run_region_window_rank on public.mission_results (mission_run_id, region, time_window, rank_position);

-- API keys
create index if not exists idx_api_keys_prefix on public.api_keys (key_prefix) where is_active = true;
create index if not exists idx_api_keys_workspace on public.api_keys (workspace_id);

-- ============================================================================
-- PART 4: RLS HELPER FUNCTIONS
-- ============================================================================

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
    select exists (
        select 1
        from public.workspace_members
        where workspace_id = ws_id
          and user_id = auth.uid()
    );
$$;

create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
    select exists (
        select 1
        from public.workspace_members
        where workspace_id = ws_id
          and user_id = auth.uid()
          and role in ('owner', 'admin')
    );
$$;

create or replace function public.is_workspace_owner(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
    select exists (
        select 1
        from public.workspaces
        where id = ws_id
          and owner_id = auth.uid()
    );
$$;

create or replace function public.get_user_workspace_ids()
returns setof uuid
language sql
security definer
stable
as $$
    select workspace_id
    from public.workspace_members
    where user_id = auth.uid();
$$;

-- ============================================================================
-- PART 5: ENABLE RLS
-- ============================================================================

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.sources enable row level security;
alter table public.keywords enable row level security;
alter table public.keyword_timeseries enable row level security;
alter table public.missions enable row level security;
alter table public.mission_runs enable row level security;
alter table public.mission_results enable row level security;
alter table public.api_keys enable row level security;

-- ============================================================================
-- PART 6: RLS POLICIES
-- ============================================================================

-- Drop existing policies first (to make script re-runnable)
drop policy if exists "Users can view their workspaces" on public.workspaces;
drop policy if exists "Users can create workspaces" on public.workspaces;
drop policy if exists "Owners can update their workspaces" on public.workspaces;
drop policy if exists "Owners can delete their workspaces" on public.workspaces;

drop policy if exists "Members can view workspace members" on public.workspace_members;
drop policy if exists "Admins can add workspace members" on public.workspace_members;
drop policy if exists "Admins can update workspace members" on public.workspace_members;
drop policy if exists "Admins can remove workspace members" on public.workspace_members;

drop policy if exists "Authenticated users can view sources" on public.sources;
drop policy if exists "Authenticated users can view keywords" on public.keywords;
drop policy if exists "Authenticated users can create keywords" on public.keywords;
drop policy if exists "Authenticated users can view timeseries" on public.keyword_timeseries;

drop policy if exists "Members can view workspace missions" on public.missions;
drop policy if exists "Admins can create missions" on public.missions;
drop policy if exists "Admins can update missions" on public.missions;
drop policy if exists "Admins can delete missions" on public.missions;

drop policy if exists "Members can view mission runs" on public.mission_runs;
drop policy if exists "Admins can create mission runs" on public.mission_runs;
drop policy if exists "Admins can update mission runs" on public.mission_runs;

drop policy if exists "Members can view mission results" on public.mission_results;

drop policy if exists "Admins can view workspace API keys" on public.api_keys;
drop policy if exists "Admins can create API keys" on public.api_keys;
drop policy if exists "Admins can update API keys" on public.api_keys;
drop policy if exists "Admins can delete API keys" on public.api_keys;

-- Workspaces policies
create policy "Users can view their workspaces"
    on public.workspaces for select
    using (public.is_workspace_member(id));

create policy "Users can create workspaces"
    on public.workspaces for insert
    with check (owner_id = auth.uid());

create policy "Owners can update their workspaces"
    on public.workspaces for update
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());

create policy "Owners can delete their workspaces"
    on public.workspaces for delete
    using (owner_id = auth.uid());

-- Workspace members policies
create policy "Members can view workspace members"
    on public.workspace_members for select
    using (public.is_workspace_member(workspace_id));

create policy "Admins can add workspace members"
    on public.workspace_members for insert
    with check (public.is_workspace_admin(workspace_id));

create policy "Admins can update workspace members"
    on public.workspace_members for update
    using (public.is_workspace_admin(workspace_id))
    with check (public.is_workspace_admin(workspace_id) and (role != 'owner' or public.is_workspace_owner(workspace_id)));

create policy "Admins can remove workspace members"
    on public.workspace_members for delete
    using (public.is_workspace_admin(workspace_id) and (public.is_workspace_owner(workspace_id) or role not in ('owner', 'admin') or user_id = auth.uid()));

-- Sources policies
create policy "Authenticated users can view sources"
    on public.sources for select
    using (auth.uid() is not null);

-- Keywords policies
create policy "Authenticated users can view keywords"
    on public.keywords for select
    using (auth.uid() is not null);

create policy "Authenticated users can create keywords"
    on public.keywords for insert
    with check (auth.uid() is not null);

-- Keyword timeseries policies
create policy "Authenticated users can view timeseries"
    on public.keyword_timeseries for select
    using (auth.uid() is not null);

-- Missions policies
create policy "Members can view workspace missions"
    on public.missions for select
    using (public.is_workspace_member(workspace_id));

create policy "Admins can create missions"
    on public.missions for insert
    with check (public.is_workspace_admin(workspace_id));

create policy "Admins can update missions"
    on public.missions for update
    using (public.is_workspace_admin(workspace_id))
    with check (public.is_workspace_admin(workspace_id));

create policy "Admins can delete missions"
    on public.missions for delete
    using (public.is_workspace_admin(workspace_id));

-- Mission runs policies
create policy "Members can view mission runs"
    on public.mission_runs for select
    using (exists (select 1 from public.missions m where m.id = mission_id and public.is_workspace_member(m.workspace_id)));

create policy "Admins can create mission runs"
    on public.mission_runs for insert
    with check (exists (select 1 from public.missions m where m.id = mission_id and public.is_workspace_admin(m.workspace_id)));

create policy "Admins can update mission runs"
    on public.mission_runs for update
    using (exists (select 1 from public.missions m where m.id = mission_id and public.is_workspace_admin(m.workspace_id)));

-- Mission results policies
create policy "Members can view mission results"
    on public.mission_results for select
    using (exists (
        select 1 from public.mission_runs mr
        join public.missions m on m.id = mr.mission_id
        where mr.id = mission_run_id and public.is_workspace_member(m.workspace_id)
    ));

-- API keys policies
create policy "Admins can view workspace API keys"
    on public.api_keys for select
    using (public.is_workspace_admin(workspace_id));

create policy "Admins can create API keys"
    on public.api_keys for insert
    with check (public.is_workspace_admin(workspace_id));

create policy "Admins can update API keys"
    on public.api_keys for update
    using (public.is_workspace_admin(workspace_id))
    with check (public.is_workspace_admin(workspace_id));

create policy "Admins can delete API keys"
    on public.api_keys for delete
    using (public.is_workspace_admin(workspace_id));

-- ============================================================================
-- PART 7: TRIGGERS
-- ============================================================================

-- Updated at trigger function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Apply triggers
drop trigger if exists set_updated_at on public.workspaces;
create trigger set_updated_at
    before update on public.workspaces
    for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.sources;
create trigger set_updated_at
    before update on public.sources
    for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.missions;
create trigger set_updated_at
    before update on public.missions
    for each row execute function public.handle_updated_at();

-- Auto-add owner as workspace member
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
as $$
begin
    insert into public.workspace_members (workspace_id, user_id, role, joined_at)
    values (new.id, new.owner_id, 'owner', now());
    return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
    after insert on public.workspaces
    for each row execute function public.handle_new_workspace();

-- Mission run number auto-increment
create or replace function public.handle_new_mission_run()
returns trigger
language plpgsql
as $$
declare
    next_run_number integer;
begin
    select coalesce(max(run_number), 0) + 1
    into next_run_number
    from public.mission_runs
    where mission_id = new.mission_id;
    new.run_number = next_run_number;
    return new;
end;
$$;

drop trigger if exists set_mission_run_number on public.mission_runs;
create trigger set_mission_run_number
    before insert on public.mission_runs
    for each row execute function public.handle_new_mission_run();

-- Update mission stats on run completion
create or replace function public.handle_mission_run_update()
returns trigger
language plpgsql
as $$
begin
    if new.status = 'COMPLETED' and old.status != 'COMPLETED' then
        if new.duration_ms is null and new.started_at is not null then
            new.duration_ms = extract(epoch from (now() - new.started_at)) * 1000;
        end if;
        new.completed_at = coalesce(new.completed_at, now());
        update public.missions
        set total_runs = total_runs + 1, last_run_at = new.completed_at, updated_at = now()
        where id = new.mission_id;
    end if;
    return new;
end;
$$;

drop trigger if exists on_mission_run_update on public.mission_runs;
create trigger on_mission_run_update
    before update on public.mission_runs
    for each row execute function public.handle_mission_run_update();

-- Update keyword stats
create or replace function public.handle_new_mission_result()
returns trigger
language plpgsql
as $$
begin
    update public.keywords
    set last_seen_at = now(), total_searches = total_searches + 1
    where id = new.keyword_id;
    return new;
end;
$$;

drop trigger if exists on_mission_result_created on public.mission_results;
create trigger on_mission_result_created
    after insert on public.mission_results
    for each row execute function public.handle_new_mission_result();

-- ============================================================================
-- PART 8: SEED DATA (Sources)
-- ============================================================================

insert into public.sources (code, name, description, base_url, is_active, rate_limits)
values
    ('GOOGLE_TRENDS', 'Google Trends', 'Google search interest data over time. Values are normalized 0-100 relative to peak interest.', 'https://trends.google.com', true, '{"requests_per_minute": 30, "requests_per_day": 1000}'::jsonb),
    ('YOUTUBE', 'YouTube Trends', 'YouTube search and video trending data.', 'https://www.googleapis.com/youtube/v3', true, '{"requests_per_minute": 60, "quota_per_day": 10000}'::jsonb),
    ('X', 'X (Twitter) Trends', 'Trending topics and hashtags from X/Twitter.', 'https://api.twitter.com/2', false, '{"requests_per_15min": 450}'::jsonb),
    ('REDDIT', 'Reddit Trends', 'Trending subreddits, posts, and topics from Reddit.', 'https://oauth.reddit.com', false, '{"requests_per_minute": 60}'::jsonb),
    ('TIKTOK', 'TikTok Trends', 'Trending hashtags and sounds from TikTok.', null, false, null),
    ('GOOGLE_NEWS', 'Google News', 'Trending news topics and stories from Google News.', 'https://news.google.com', false, '{"requests_per_minute": 30}'::jsonb),
    ('CUSTOM', 'Custom Source', 'User-defined custom data source.', null, true, null)
on conflict (code) do update set
    name = excluded.name,
    description = excluded.description,
    base_url = excluded.base_url,
    rate_limits = excluded.rate_limits,
    updated_at = now();

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================
-- Verify with: SELECT * FROM public.sources;
-- ============================================================================
