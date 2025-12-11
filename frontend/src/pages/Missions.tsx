import { useState, useEffect, useCallback } from 'react'
import { Plus, Play, Pause, Settings, Trash2, Clock, CheckCircle, XCircle, AlertCircle, Target, RefreshCw } from 'lucide-react'
import { cn } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { CreateMissionModal } from '../components/CreateMissionModal'
import type { MissionStatus, RunStatus } from '../types/database'
import { useTheme } from '../contexts/ThemeContext'

interface Mission {
  id: string
  name: string
  description: string | null
  status: MissionStatus
  total_runs: number
  last_run_at: string | null
  config: {
    keywords?: string[]
    regions?: string[]
    sources?: string[]
  }
  created_at: string
}

function getStatusIcon(status: RunStatus | null) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'RUNNING':
      return <AlertCircle className="h-4 w-4 text-yellow-500 animate-pulse" />
    default:
      return <Clock className="h-4 w-4 text-gray-500" />
  }
}

function getStatusColor(status: MissionStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    case 'INACTIVE':
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    case 'ARCHIVED':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
  }
}

export function Missions() {
  const { theme } = useTheme()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchMissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMissions(data || [])
    } catch (err) {
      console.error('Error fetching missions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMissions()
  }, [fetchMissions])

  const toggleMissionStatus = async (mission: Mission) => {
    const newStatus: MissionStatus = mission.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      const { error } = await (supabase
        .from('missions') as any)
        .update({ status: newStatus })
        .eq('id', mission.id)

      if (error) throw error
      fetchMissions()
    } catch (err) {
      console.error('Error updating mission:', err)
    }
  }

  const deleteMission = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mission?')) return

    try {
      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchMissions()
    } catch (err) {
      console.error('Error deleting mission:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn(
            "text-3xl font-bold",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>Missions</h1>
          <p className={cn(
            "mt-1",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          )}>Automated trend hunting jobs</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMissions}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
              theme === 'dark'
                ? 'glass-button text-gray-400 hover:text-white'
                : 'glass-button-light text-gray-600 hover:text-gray-900'
            )}
          >
            <RefreshCw className="h-5 w-5" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-200 shadow-lg shadow-emerald-500/25"
          >
            <Plus className="h-5 w-5" />
            New Mission
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cn(
          "rounded-xl p-4",
          theme === 'dark' ? 'glass-card' : 'glass-card-light'
        )}>
          <p className={cn(
            "text-sm",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          )}>Total Missions</p>
          <p className={cn(
            "text-2xl font-bold mt-1",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            {loading ? '...' : missions.length}
          </p>
        </div>
        <div className={cn(
          "rounded-xl p-4",
          theme === 'dark' ? 'glass-card' : 'glass-card-light'
        )}>
          <p className={cn(
            "text-sm",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          )}>Active</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">
            {loading ? '...' : missions.filter((m) => m.status === 'ACTIVE').length}
          </p>
        </div>
        <div className={cn(
          "rounded-xl p-4",
          theme === 'dark' ? 'glass-card' : 'glass-card-light'
        )}>
          <p className={cn(
            "text-sm",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          )}>Total Runs</p>
          <p className={cn(
            "text-2xl font-bold mt-1",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            {loading ? '...' : missions.reduce((acc, m) => acc + (m.total_runs || 0), 0)}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <RefreshCw className={cn(
            "h-8 w-8 mx-auto mb-4 animate-spin",
            theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
          )} />
          <p className={cn(
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          )}>Loading missions...</p>
        </div>
      )}

      {/* Missions List */}
      {!loading && missions.length > 0 && (
        <div className="space-y-4">
          {missions.map((mission) => (
            <div
              key={mission.id}
              className={cn(
                "rounded-xl p-6 transition-all duration-200",
                theme === 'dark' ? 'glass-card hover:bg-white/[0.08]' : 'glass-card-light hover:bg-black/[0.04]'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className={cn(
                      "text-lg font-semibold",
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    )}>{mission.name}</h3>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium border',
                        getStatusColor(mission.status)
                      )}
                    >
                      {mission.status}
                    </span>
                  </div>
                  {mission.description && (
                    <p className={cn(
                      "text-sm mt-1",
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    )}>{mission.description}</p>
                  )}

                  {/* Config badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {mission.config?.keywords?.map((keyword) => (
                      <span
                        key={keyword}
                        className={cn(
                          "px-2 py-0.5 text-xs rounded-md",
                          theme === 'dark'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-emerald-500/10 text-emerald-600'
                        )}
                      >
                        {keyword}
                      </span>
                    ))}
                    {mission.config?.regions?.map((region) => (
                      <span
                        key={region}
                        className={cn(
                          "px-2 py-0.5 text-xs rounded-md",
                          theme === 'dark'
                            ? 'bg-gray-700/50 text-gray-400'
                            : 'bg-gray-200 text-gray-600'
                        )}
                      >
                        {region}
                      </span>
                    ))}
                    {mission.config?.sources?.map((source) => (
                      <span
                        key={source}
                        className={cn(
                          "px-2 py-0.5 text-xs rounded-md",
                          theme === 'dark'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-blue-500/10 text-blue-600'
                        )}
                      >
                        {source}
                      </span>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(null)}
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                        Last run:{' '}
                        {mission.last_run_at
                          ? new Date(mission.last_run_at).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                    <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                      <span className={cn(
                        "font-medium",
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      )}>{mission.total_runs || 0}</span> total runs
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMissionStatus(mission)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      mission.status === 'ACTIVE'
                        ? 'text-yellow-500 hover:bg-yellow-500/10'
                        : 'text-green-500 hover:bg-green-500/10'
                    )}
                    title={mission.status === 'ACTIVE' ? 'Pause mission' : 'Activate mission'}
                  >
                    {mission.status === 'ACTIVE' ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </button>
                  <button className={cn(
                    "p-2 rounded-lg transition-all duration-150",
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-white hover:bg-white/10'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'
                  )}>
                    <Settings className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => deleteMission(mission.id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && missions.length === 0 && (
        <div className={cn(
          "text-center py-12 rounded-xl",
          theme === 'dark' ? 'glass-card' : 'glass-card-light'
        )}>
          <Target className={cn(
            "h-12 w-12 mx-auto mb-4",
            theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
          )} />
          <h3 className={cn(
            "text-lg font-medium",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>No missions yet</h3>
          <p className={cn(
            "mt-1",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          )}>Create your first mission to start hunting trends</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-150 shadow-lg shadow-emerald-500/25"
          >
            Create Mission
          </button>
        </div>
      )}

      {/* Create Mission Modal */}
      <CreateMissionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchMissions}
      />
    </div>
  )
}
