export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'
export type MissionStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
export type RunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
export type TimeGranularity = 'minute' | 'hour' | 'day' | 'week'
export type TimeWindow = '1h' | '4h' | '24h' | '7d' | '30d' | '90d'
export type SourceCode = 'GOOGLE_TRENDS' | 'YOUTUBE' | 'X' | 'REDDIT' | 'TIKTOK' | 'GOOGLE_NEWS' | 'CUSTOM'

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          slug: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          slug?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: WorkspaceRole
          invited_by: string | null
          invited_at: string | null
          joined_at: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: WorkspaceRole
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: WorkspaceRole
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string
          created_at?: string
        }
      }
      sources: {
        Row: {
          id: string
          code: SourceCode
          name: string
          description: string | null
          base_url: string | null
          is_active: boolean
          rate_limits: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: SourceCode
          name: string
          description?: string | null
          base_url?: string | null
          is_active?: boolean
          rate_limits?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: SourceCode
          name?: string
          description?: string | null
          base_url?: string | null
          is_active?: boolean
          rate_limits?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      keywords: {
        Row: {
          id: string
          keyword: string
          normalized_keyword: string
          language: string | null
          category: string | null
          first_seen_at: string
          last_seen_at: string
          total_searches: number
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          keyword: string
          language?: string | null
          category?: string | null
          first_seen_at?: string
          last_seen_at?: string
          total_searches?: number
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          keyword?: string
          language?: string | null
          category?: string | null
          first_seen_at?: string
          last_seen_at?: string
          total_searches?: number
          metadata?: Json | null
          created_at?: string
        }
      }
      keyword_timeseries: {
        Row: {
          id: number
          keyword_id: string
          source_id: string
          region: string
          granularity: TimeGranularity
          ts: string
          interest_value: number
          sample_size: number | null
          is_partial: boolean
          metadata: Json | null
          created_at: string
        }
        Insert: {
          keyword_id: string
          source_id: string
          region?: string
          granularity: TimeGranularity
          ts: string
          interest_value: number
          sample_size?: number | null
          is_partial?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          keyword_id?: string
          source_id?: string
          region?: string
          granularity?: TimeGranularity
          ts?: string
          interest_value?: number
          sample_size?: number | null
          is_partial?: boolean
          metadata?: Json | null
          created_at?: string
        }
      }
      missions: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          status: MissionStatus
          config: Json
          schedule_cron: string | null
          next_run_at: string | null
          total_runs: number
          last_run_at: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          status?: MissionStatus
          config?: Json
          schedule_cron?: string | null
          next_run_at?: string | null
          total_runs?: number
          last_run_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          status?: MissionStatus
          config?: Json
          schedule_cron?: string | null
          next_run_at?: string | null
          total_runs?: number
          last_run_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      mission_runs: {
        Row: {
          id: string
          mission_id: string
          run_number: number
          status: RunStatus
          scheduled_at: string | null
          started_at: string | null
          completed_at: string | null
          duration_ms: number | null
          keywords_scanned: number
          keywords_matched: number
          error_code: string | null
          error_message: string | null
          retry_count: number
          stats: Json | null
          created_at: string
          triggered_by: string | null
        }
        Insert: {
          id?: string
          mission_id: string
          run_number?: number
          status?: RunStatus
          scheduled_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          keywords_scanned?: number
          keywords_matched?: number
          error_code?: string | null
          error_message?: string | null
          retry_count?: number
          stats?: Json | null
          created_at?: string
          triggered_by?: string | null
        }
        Update: {
          id?: string
          mission_id?: string
          run_number?: number
          status?: RunStatus
          scheduled_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          keywords_scanned?: number
          keywords_matched?: number
          error_code?: string | null
          error_message?: string | null
          retry_count?: number
          stats?: Json | null
          created_at?: string
          triggered_by?: string | null
        }
      }
      mission_results: {
        Row: {
          id: number
          mission_run_id: string
          keyword_id: string
          source_id: string
          region: string
          time_window: TimeWindow
          current_interest: number
          baseline_interest: number
          peak_interest: number | null
          trend_score: number
          volume_score: number | null
          velocity_score: number | null
          rank_position: number
          rank_change: number | null
          related_keywords: string[] | null
          metrics: Json | null
          created_at: string
        }
        Insert: {
          mission_run_id: string
          keyword_id: string
          source_id: string
          region: string
          time_window: TimeWindow
          current_interest: number
          baseline_interest: number
          peak_interest?: number | null
          trend_score: number
          volume_score?: number | null
          velocity_score?: number | null
          rank_position: number
          rank_change?: number | null
          related_keywords?: string[] | null
          metrics?: Json | null
          created_at?: string
        }
        Update: {
          mission_run_id?: string
          keyword_id?: string
          source_id?: string
          region?: string
          time_window?: TimeWindow
          current_interest?: number
          baseline_interest?: number
          peak_interest?: number | null
          trend_score?: number
          volume_score?: number | null
          velocity_score?: number | null
          rank_position?: number
          rank_change?: number | null
          related_keywords?: string[] | null
          metrics?: Json | null
          created_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          workspace_id: string
          name: string
          key_hash: string
          key_prefix: string
          permissions: string[]
          last_used_at: string | null
          expires_at: string | null
          is_active: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          key_hash: string
          key_prefix: string
          permissions?: string[]
          last_used_at?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          key_hash?: string
          key_prefix?: string
          permissions?: string[]
          last_used_at?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      workspace_role: WorkspaceRole
      mission_status: MissionStatus
      run_status: RunStatus
      time_granularity: TimeGranularity
      time_window: TimeWindow
      source_code: SourceCode
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience exports
export type Workspace = Tables<'workspaces'>
export type WorkspaceMember = Tables<'workspace_members'>
export type Source = Tables<'sources'>
export type Keyword = Tables<'keywords'>
export type KeywordTimeseries = Tables<'keyword_timeseries'>
export type Mission = Tables<'missions'>
export type MissionRun = Tables<'mission_runs'>
export type MissionResult = Tables<'mission_results'>
export type ApiKey = Tables<'api_keys'>
