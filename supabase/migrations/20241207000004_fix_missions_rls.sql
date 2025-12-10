-- Fix missions RLS to allow unauthenticated access for development
-- and create a default workspace

-- Drop existing policies if any
drop policy if exists "Users can view missions in their workspaces" on public.missions;
drop policy if exists "Users can create missions in their workspaces" on public.missions;
drop policy if exists "Users can update missions in their workspaces" on public.missions;
drop policy if exists "Users can delete missions in their workspaces" on public.missions;

-- Create permissive policies for development
create policy "Anyone can view missions"
    on public.missions for select
    using (true);

create policy "Anyone can create missions"
    on public.missions for insert
    with check (true);

create policy "Anyone can update missions"
    on public.missions for update
    using (true);

create policy "Anyone can delete missions"
    on public.missions for delete
    using (true);

-- Also fix workspaces RLS
drop policy if exists "Owners can view their workspaces" on public.workspaces;
drop policy if exists "Users can view workspaces they belong to" on public.workspaces;
drop policy if exists "Owners can update their workspaces" on public.workspaces;

create policy "Anyone can view workspaces"
    on public.workspaces for select
    using (true);

create policy "Anyone can create workspaces"
    on public.workspaces for insert
    with check (true);

create policy "Anyone can update workspaces"
    on public.workspaces for update
    using (true);

-- Make owner_id nullable for development
alter table public.workspaces alter column owner_id drop not null;

-- Create a default workspace if none exists
insert into public.workspaces (id, name, slug)
select
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Default Workspace',
    'default'
where not exists (
    select 1 from public.workspaces where slug = 'default'
);
