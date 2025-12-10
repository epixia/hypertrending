-- Markets hierarchy table using adjacency list pattern
create table if not exists public.markets (
    id              uuid primary key default gen_random_uuid(),
    parent_id       uuid references public.markets (id) on delete cascade,
    name            text not null,
    slug            text not null,
    level           integer not null default 0,
    path            text not null default '',
    description     text,
    icon            text,
    color           text,
    sort_order      integer not null default 0,
    is_active       boolean not null default true,
    metadata        jsonb not null default '{}',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    constraint markets_name_length check (char_length(name) between 1 and 200)
);

-- Create indexes for efficient tree queries
create index if not exists idx_markets_parent on public.markets (parent_id);
create index if not exists idx_markets_level on public.markets (level);
create index if not exists idx_markets_path on public.markets (path);
create index if not exists idx_markets_slug on public.markets (slug);

-- RLS policies for markets
alter table public.markets enable row level security;

create policy "Anyone can view markets"
    on public.markets for select
    using (true);

create policy "Anyone can create markets"
    on public.markets for insert
    with check (true);

create policy "Anyone can update markets"
    on public.markets for update
    using (true);

create policy "Anyone can delete markets"
    on public.markets for delete
    using (true);

-- Function to update path when parent changes
create or replace function update_market_path()
returns trigger as $$
declare
    parent_path text;
begin
    if new.parent_id is null then
        new.path := new.id::text;
        new.level := 0;
    else
        select path into parent_path from public.markets where id = new.parent_id;
        new.path := parent_path || '/' || new.id::text;
        new.level := array_length(string_to_array(new.path, '/'), 1) - 1;
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_update_market_path
    before insert or update of parent_id on public.markets
    for each row
    execute function update_market_path();
