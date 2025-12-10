-- Allow public insert/update on keywords for ingestion
drop policy if exists "Authenticated users can create keywords" on public.keywords;
drop policy if exists "Authenticated users can view keywords" on public.keywords;

-- Allow anyone to read keywords
create policy "Anyone can view keywords"
    on public.keywords for select
    using (true);

-- Allow anyone to insert keywords (for ingestion service)
create policy "Anyone can create keywords"
    on public.keywords for insert
    with check (true);

-- Allow anyone to update keywords
create policy "Anyone can update keywords"
    on public.keywords for update
    using (true);

-- Allow public insert on keyword_timeseries
drop policy if exists "Authenticated users can view timeseries" on public.keyword_timeseries;

create policy "Anyone can view timeseries"
    on public.keyword_timeseries for select
    using (true);

create policy "Anyone can create timeseries"
    on public.keyword_timeseries for insert
    with check (true);
