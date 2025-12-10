-- Allow update on keyword_timeseries for upsert operations
create policy "Anyone can update timeseries"
    on public.keyword_timeseries for update
    using (true);
