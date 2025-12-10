-- ============================================================================
-- FIX ALL CONSTRAINTS FOR DEVELOPMENT MODE
-- ============================================================================
-- Run this in Supabase SQL Editor to enable mission creation without auth
-- ============================================================================

-- 1. Drop any problematic triggers
drop trigger if exists on_workspace_created on public.workspaces;
drop trigger if exists handle_workspace_created on public.workspaces;

-- 2. Make owner_id nullable in workspaces
do $$
begin
    alter table public.workspaces alter column owner_id drop not null;
exception when others then
    raise notice 'owner_id already nullable or does not exist';
end $$;

-- 3. Make user_id nullable in workspace_members
do $$
begin
    alter table public.workspace_members alter column user_id drop not null;
exception when others then
    raise notice 'user_id already nullable or does not exist';
end $$;

-- 4. Drop all restrictive RLS policies on workspaces
drop policy if exists "Users can view workspaces they belong to" on public.workspaces;
drop policy if exists "Owners can view their workspaces" on public.workspaces;
drop policy if exists "Owners can update their workspaces" on public.workspaces;
drop policy if exists "Owners can delete their workspaces" on public.workspaces;

-- 5. Create permissive policies for workspaces
drop policy if exists "Anyone can view workspaces" on public.workspaces;
drop policy if exists "Anyone can create workspaces" on public.workspaces;
drop policy if exists "Anyone can update workspaces" on public.workspaces;
drop policy if exists "Anyone can delete workspaces" on public.workspaces;

create policy "Anyone can view workspaces"
    on public.workspaces for select using (true);

create policy "Anyone can create workspaces"
    on public.workspaces for insert with check (true);

create policy "Anyone can update workspaces"
    on public.workspaces for update using (true);

create policy "Anyone can delete workspaces"
    on public.workspaces for delete using (true);

-- 6. Drop all restrictive RLS policies on missions
drop policy if exists "Users can view missions in their workspaces" on public.missions;
drop policy if exists "Users can create missions in their workspaces" on public.missions;
drop policy if exists "Users can update missions in their workspaces" on public.missions;
drop policy if exists "Users can delete missions in their workspaces" on public.missions;

-- 7. Create permissive policies for missions
drop policy if exists "Anyone can view missions" on public.missions;
drop policy if exists "Anyone can create missions" on public.missions;
drop policy if exists "Anyone can update missions" on public.missions;
drop policy if exists "Anyone can delete missions" on public.missions;

create policy "Anyone can view missions"
    on public.missions for select using (true);

create policy "Anyone can create missions"
    on public.missions for insert with check (true);

create policy "Anyone can update missions"
    on public.missions for update using (true);

create policy "Anyone can delete missions"
    on public.missions for delete using (true);

-- 8. Drop all restrictive RLS policies on workspace_members
drop policy if exists "Users can view workspace members" on public.workspace_members;
drop policy if exists "Workspace owners can manage members" on public.workspace_members;

-- 9. Create permissive policies for workspace_members
drop policy if exists "Anyone can view workspace members" on public.workspace_members;
drop policy if exists "Anyone can create workspace members" on public.workspace_members;
drop policy if exists "Anyone can update workspace members" on public.workspace_members;
drop policy if exists "Anyone can delete workspace members" on public.workspace_members;

create policy "Anyone can view workspace members"
    on public.workspace_members for select using (true);

create policy "Anyone can create workspace members"
    on public.workspace_members for insert with check (true);

create policy "Anyone can update workspace members"
    on public.workspace_members for update using (true);

create policy "Anyone can delete workspace members"
    on public.workspace_members for delete using (true);

-- 10. Create permissive policies for keywords
drop policy if exists "Anyone can view keywords" on public.keywords;
drop policy if exists "Anyone can create keywords" on public.keywords;
drop policy if exists "Anyone can update keywords" on public.keywords;

create policy "Anyone can view keywords"
    on public.keywords for select using (true);

create policy "Anyone can create keywords"
    on public.keywords for insert with check (true);

create policy "Anyone can update keywords"
    on public.keywords for update using (true);

-- 11. Create the default workspace if it doesn't exist
insert into public.workspaces (id, name, slug)
select
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Default Workspace',
    'default'
where not exists (
    select 1 from public.workspaces where id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- 12. Verify the workspace exists
select id, name, slug, owner_id from public.workspaces where id = '00000000-0000-0000-0000-000000000001'::uuid;
