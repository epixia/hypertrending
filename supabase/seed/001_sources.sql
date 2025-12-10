-- ============================================================================
-- HYPERTRENDING.COM - Seed Data: Sources
-- ============================================================================
-- Initial data sources for the platform.
-- Run this after all migrations.
-- ============================================================================

insert into public.sources (code, name, description, base_url, is_active, rate_limits)
values
    (
        'GOOGLE_TRENDS',
        'Google Trends',
        'Google search interest data over time. Values are normalized 0-100 relative to peak interest.',
        'https://trends.google.com',
        true,
        '{"requests_per_minute": 30, "requests_per_day": 1000}'::jsonb
    ),
    (
        'YOUTUBE',
        'YouTube Trends',
        'YouTube search and video trending data.',
        'https://www.googleapis.com/youtube/v3',
        true,
        '{"requests_per_minute": 60, "quota_per_day": 10000}'::jsonb
    ),
    (
        'X',
        'X (Twitter) Trends',
        'Trending topics and hashtags from X/Twitter.',
        'https://api.twitter.com/2',
        false,  -- Not active initially, requires API setup
        '{"requests_per_15min": 450}'::jsonb
    ),
    (
        'REDDIT',
        'Reddit Trends',
        'Trending subreddits, posts, and topics from Reddit.',
        'https://oauth.reddit.com',
        false,
        '{"requests_per_minute": 60}'::jsonb
    ),
    (
        'TIKTOK',
        'TikTok Trends',
        'Trending hashtags and sounds from TikTok.',
        null,
        false,
        null
    ),
    (
        'GOOGLE_NEWS',
        'Google News',
        'Trending news topics and stories from Google News.',
        'https://news.google.com',
        false,
        '{"requests_per_minute": 30}'::jsonb
    ),
    (
        'CUSTOM',
        'Custom Source',
        'User-defined custom data source.',
        null,
        true,
        null
    )
on conflict (code) do update set
    name = excluded.name,
    description = excluded.description,
    base_url = excluded.base_url,
    rate_limits = excluded.rate_limits,
    updated_at = now();
