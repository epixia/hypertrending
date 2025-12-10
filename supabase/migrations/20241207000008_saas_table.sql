-- SaaS Apps table for tracking startups from Starter Story
CREATE TABLE IF NOT EXISTS saas_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,

    -- Revenue info
    mrr INTEGER, -- Monthly recurring revenue in dollars
    arr INTEGER, -- Annual recurring revenue
    revenue_verified BOOLEAN DEFAULT FALSE,
    revenue_date TIMESTAMPTZ, -- When the revenue was reported

    -- Company info
    website_url TEXT,
    founder_name VARCHAR(255),
    founder_twitter VARCHAR(255),
    founded_date DATE,
    employee_count INTEGER,
    category VARCHAR(100),

    -- YouTube/Starter Story info
    youtube_video_id VARCHAR(20),
    youtube_title TEXT,
    youtube_description TEXT,
    youtube_transcript TEXT,
    youtube_published_at TIMESTAMPTZ,

    -- Extracted/parsed info
    tech_stack TEXT[], -- Array of technologies used
    business_model VARCHAR(100), -- SaaS, Marketplace, etc.
    target_market TEXT,
    key_metrics JSONB, -- Other metrics like users, customers, etc.

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create slug from name
CREATE OR REPLACE FUNCTION generate_saas_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
        NEW.slug := trim(both '-' from NEW.slug);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saas_slug_trigger
    BEFORE INSERT ON saas_apps
    FOR EACH ROW
    EXECUTE FUNCTION generate_saas_slug();

-- Update timestamp trigger
CREATE TRIGGER saas_updated_at
    BEFORE UPDATE ON saas_apps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_saas_apps_mrr ON saas_apps(mrr DESC NULLS LAST);
CREATE INDEX idx_saas_apps_category ON saas_apps(category);
CREATE INDEX idx_saas_apps_slug ON saas_apps(slug);
CREATE INDEX idx_saas_apps_youtube_id ON saas_apps(youtube_video_id);

-- RLS Policies
ALTER TABLE saas_apps ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "saas_apps_select_policy" ON saas_apps
    FOR SELECT USING (true);

-- Allow authenticated users to insert
CREATE POLICY "saas_apps_insert_policy" ON saas_apps
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "saas_apps_update_policy" ON saas_apps
    FOR UPDATE USING (true);

-- Allow authenticated users to delete
CREATE POLICY "saas_apps_delete_policy" ON saas_apps
    FOR DELETE USING (true);

-- Insert some initial data from Starter Story
INSERT INTO saas_apps (name, description, mrr, category, youtube_video_id, website_url, founder_name) VALUES
('ListKit', 'Lead generation and email list building platform for sales teams', 125000, 'Lead Generation', NULL, 'https://listkit.io', NULL),
('Arvow', 'Business productivity and workflow automation tool', 79000, 'Productivity', NULL, NULL, NULL),
('Yadaphone', 'VoIP and business communication platform', 14000, 'Communication', NULL, NULL, NULL),
('Findymail', 'Email finder and verification tool for outreach', 2500, 'Email Tools', NULL, 'https://findymail.com', NULL)
ON CONFLICT (slug) DO NOTHING;
