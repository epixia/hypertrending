"""
Add niche column to saas_apps table.

Usage:
    python add_niche_column.py --db-url "postgresql://postgres:YOUR_PASSWORD@db.nvjorsmbjckaaodvlssl.supabase.co:5432/postgres"
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
-- Add niche column to saas_apps table
ALTER TABLE saas_apps ADD COLUMN IF NOT EXISTS niche VARCHAR(255);
"""

def run_migration(db_url: str):
    """Run the migration against the database."""
    print(f"Connecting to database...")

    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()

        print("Adding niche column...")
        cursor.execute(MIGRATION_SQL)

        print("Migration completed successfully!")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"Error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Add niche column to saas_apps table')
    parser.add_argument('--db-url', help='Database connection URL')
    args = parser.parse_args()

    db_url = args.db_url or os.getenv('DATABASE_URL')

    if not db_url:
        print("=" * 60)
        print("DATABASE URL REQUIRED")
        print("=" * 60)
        print("\nTo run this migration, provide your Supabase database URL.")
        print("\nRun:")
        print(f'\n  python add_niche_column.py --db-url "postgresql://postgres:YOUR_PASSWORD@db.nvjorsmbjckaaodvlssl.supabase.co:5432/postgres"')
        print("\n" + "=" * 60)
        print("\nALTERNATIVE: Run SQL directly in Supabase Dashboard")
        print("=" * 60)
        print("\n1. Go to: https://supabase.com/dashboard/project/nvjorsmbjckaaodvlssl/sql/new")
        print("2. Run this SQL:")
        print("\n   ALTER TABLE saas_apps ADD COLUMN IF NOT EXISTS niche VARCHAR(255);")
        print("\n3. Click 'Run'")
        return False

    return run_migration(db_url)


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
