"""
Run the saas_apps table migration against Supabase.

Usage:
    python run_migration.py --db-url "postgresql://postgres:YOUR_PASSWORD@db.nvjorsmbjckaaodvlssl.supabase.co:5432/postgres"

Or set environment variable:
    set DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.nvjorsmbjckaaodvlssl.supabase.co:5432/postgres
    python run_migration.py
"""
import os
import sys
import argparse

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2-binary...")
    os.system(f"{sys.executable} -m pip install psycopg2-binary")
    import psycopg2

MIGRATION_SQL = """
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

-- Create slug from name (if function doesn't exist)
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

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS saas_slug_trigger ON saas_apps;
CREATE TRIGGER saas_slug_trigger
    BEFORE INSERT ON saas_apps
    FOR EACH ROW
    EXECUTE FUNCTION generate_saas_slug();

-- Check if update_updated_at function exists, create if not
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS saas_updated_at ON saas_apps;
CREATE TRIGGER saas_updated_at
    BEFORE UPDATE ON saas_apps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Indexes (CREATE IF NOT EXISTS for indexes requires different approach)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_saas_apps_mrr') THEN
        CREATE INDEX idx_saas_apps_mrr ON saas_apps(mrr DESC NULLS LAST);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_saas_apps_category') THEN
        CREATE INDEX idx_saas_apps_category ON saas_apps(category);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_saas_apps_slug') THEN
        CREATE INDEX idx_saas_apps_slug ON saas_apps(slug);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_saas_apps_youtube_id') THEN
        CREATE INDEX idx_saas_apps_youtube_id ON saas_apps(youtube_video_id);
    END IF;
END $$;

-- RLS Policies
ALTER TABLE saas_apps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "saas_apps_select_policy" ON saas_apps;
CREATE POLICY "saas_apps_select_policy" ON saas_apps
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "saas_apps_insert_policy" ON saas_apps;
CREATE POLICY "saas_apps_insert_policy" ON saas_apps
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "saas_apps_update_policy" ON saas_apps;
CREATE POLICY "saas_apps_update_policy" ON saas_apps
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "saas_apps_delete_policy" ON saas_apps;
CREATE POLICY "saas_apps_delete_policy" ON saas_apps
    FOR DELETE USING (true);
"""

def run_migration(db_url: str):
    """Run the migration against the database."""
    print(f"Connecting to database...")

    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()

        print("Running migration...")
        cursor.execute(MIGRATION_SQL)

        print("Migration completed successfully!")

        # Verify table exists
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'saas_apps'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()

        print(f"\nTable 'saas_apps' created with {len(columns)} columns:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]}")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"Error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Run saas_apps table migration')
    parser.add_argument('--db-url', help='Database connection URL')
    args = parser.parse_args()

    db_url = args.db_url or os.getenv('DATABASE_URL')

    if not db_url:
        print("=" * 60)
        print("DATABASE URL REQUIRED")
        print("=" * 60)
        print("\nTo run this migration, you need your Supabase database password.")
        print("\n1. Go to: https://supabase.com/dashboard/project/nvjorsmbjckaaodvlssl/settings/database")
        print("2. Under 'Connection string', copy the URI format")
        print("3. Replace [YOUR-PASSWORD] with your database password")
        print("\nThen run one of:")
        print(f'\n  python run_migration.py --db-url "postgresql://postgres:YOUR_PASSWORD@db.nvjorsmbjckaaodvlssl.supabase.co:5432/postgres"')
        print("\nOr set environment variable:")
        print('  set DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.nvjorsmbjckaaodvlssl.supabase.co:5432/postgres')
        print('  python run_migration.py')
        print("\n" + "=" * 60)
        print("\nALTERNATIVE: Run SQL directly in Supabase Dashboard")
        print("=" * 60)
        print("\n1. Go to: https://supabase.com/dashboard/project/nvjorsmbjckaaodvlssl/sql/new")
        print("2. Copy and paste the migration SQL from:")
        print("   supabase/migrations/20241207000008_saas_table.sql")
        print("3. Click 'Run'")
        return False

    return run_migration(db_url)


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
