-- Allow public read access to sources (no auth required)
drop policy if exists "Authenticated users can view sources" on public.sources;
create policy "Anyone can view sources"
    on public.sources for select
    using (true);
