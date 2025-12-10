-- Fix the workspace trigger that requires user_id
-- First, drop or modify the trigger that's causing issues

-- Drop the problematic trigger
drop trigger if exists on_workspace_created on public.workspaces;

-- Also fix workspace_members RLS
drop policy if exists "Users can view workspace members" on public.workspace_members;
drop policy if exists "Workspace owners can manage members" on public.workspace_members;

create policy "Anyone can view workspace members"
    on public.workspace_members for select
    using (true);

create policy "Anyone can create workspace members"
    on public.workspace_members for insert
    with check (true);

create policy "Anyone can update workspace members"
    on public.workspace_members for update
    using (true);

create policy "Anyone can delete workspace members"
    on public.workspace_members for delete
    using (true);

-- Make user_id nullable in workspace_members for development
alter table public.workspace_members alter column user_id drop not null;

-- Now we can safely create the default workspace
insert into public.workspaces (id, name, slug)
select
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Default Workspace',
    'default'
where not exists (
    select 1 from public.workspaces where id = '00000000-0000-0000-0000-000000000001'::uuid
);
