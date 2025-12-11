import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, Target, Activity, Zap, ArrowRight, RefreshCw, Play, Pause, Monitor } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatCard } from '../components/StatCard'
import { TrendCard } from '../components/TrendCard'
import { ToastContainer, useToasts } from '../components/Toast'
import { LiveMonitorPanel } from '../components/LiveMonitorPanel'
import type { LogEntry } from '../types/monitor'
import { supabase } from '../lib/supabase'
import type { Source } from '../types/database'
import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

const API_URL = import.meta.env.VITE_API_URL || ''

interface TrendingKeyword {
  rank: number
  keyword: string
  keyword_id: string
  trendScore: number
  currentInterest: number
  rankChange: number | null
  sparklineData: number[]
  lastUpdated?: Date
  isRefreshing?: boolean
}

export function Dashboard() {
  const { theme } = useTheme()
  const [sources, setSources] = useState<Source[]>([])
  const [keywords, setKeywords] = useState<TrendingKeyword[]>([])
  const [keywordCount, setKeywordCount] = useState(0)
  const [dataPoints, setDataPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLiveMonitoring, setIsLiveMonitoring] = useState(false)
  const [lastGlobalRefresh, setLastGlobalRefresh] = useState<Date | null>(null)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [currentRefreshIndex, setCurrentRefreshIndex] = useState(-1)
  const { toasts, addToast, dismissToast } = useToasts()
  const [monitorLogs, setMonitorLogs] = useState<LogEntry[]>([])
  const [isMonitorOpen, setIsMonitorOpen] = useState(false)
  const [currentRefreshingKeyword, setCurrentRefreshingKeyword] = useState<string | undefined>()

  // Add log entry helper
  const addLog = useCallback((type: LogEntry['type'], keyword: string | undefined, message: string, details?: LogEntry['details']) => {
    const entry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      keyword,
      message,
      details
    }
    setMonitorLogs(prev => [...prev.slice(-100), entry]) // Keep last 100 logs
  }, [])

  // Refresh a single keyword via API
  const refreshKeyword = useCallback(async (keyword: string, keywordId: string) => {
    const startTime = Date.now()
    setCurrentRefreshingKeyword(keyword)
    addLog('fetch', keyword, 'Starting data fetch from Google Trends API...')
    addToast('info', `Refreshing "${keyword}"`, 'Fetching latest data from Google Trends...')

    // Get previous values for comparison
    const prevKeyword = keywords.find(k => k.keyword_id === keywordId)
    const prevInterest = prevKeyword?.currentInterest
    const prevTrendScore = prevKeyword?.trendScore

    setKeywords(prev => prev.map(k =>
      k.keyword_id === keywordId ? { ...k, isRefreshing: true } : k
    ))

    try {
      addLog('info', keyword, 'Sending request to API server...')

      const response = await fetch(`${API_URL}/api/refresh-trend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, region: 'US' })
      })

      if (!response.ok) {
        throw new Error(`Failed to refresh: ${response.statusText}`)
      }

      const data = await response.json()
      const duration = Date.now() - startTime

      addLog('success', keyword, 'Successfully fetched and stored data', {
        currentInterest: data.current_interest,
        previousInterest: prevInterest,
        trendScore: data.trend_score,
        previousTrendScore: prevTrendScore,
        dataPoints: data.data_points,
        duration
      })

      setKeywords(prev => {
        const updated = prev.map(k =>
          k.keyword_id === keywordId ? {
            ...k,
            currentInterest: data.current_interest,
            trendScore: data.trend_score,
            sparklineData: data.sparkline,
            lastUpdated: new Date(),
            isRefreshing: false
          } : k
        )
        // Re-sort by trend score and update ranks
        updated.sort((a, b) => b.trendScore - a.trendScore)
        updated.forEach((item, index) => { item.rank = index + 1 })
        return updated
      })

      addToast('success', `Updated "${keyword}"`, `Interest: ${data.current_interest}, Trend: ${data.trend_score > 0 ? '+' : ''}${data.trend_score}%`)
      setCurrentRefreshingKeyword(undefined)
      return true
    } catch (err) {
      const duration = Date.now() - startTime
      console.error(`Error refreshing ${keyword}:`, err)
      addLog('error', keyword, err instanceof Error ? err.message : 'Unknown error', { duration })
      addToast('error', `Failed to refresh "${keyword}"`, err instanceof Error ? err.message : 'Unknown error')
      setKeywords(prev => prev.map(k =>
        k.keyword_id === keywordId ? { ...k, isRefreshing: false } : k
      ))
      setCurrentRefreshingKeyword(undefined)
      return false
    }
  }, [addToast, addLog, keywords])

  // Refresh all keywords sequentially (to avoid rate limiting)
  const refreshAllKeywords = useCallback(async () => {
    if (refreshingAll || keywords.length === 0) return

    setRefreshingAll(true)
    for (let i = 0; i < keywords.length; i++) {
      setCurrentRefreshIndex(i)
      await refreshKeyword(keywords[i].keyword, keywords[i].keyword_id)
      // Wait 15 seconds between requests to avoid rate limiting
      if (i < keywords.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 15000))
      }
    }
    setCurrentRefreshIndex(-1)
    setRefreshingAll(false)
    setLastGlobalRefresh(new Date())
  }, [keywords, refreshingAll, refreshKeyword])

  // Live monitoring effect
  useEffect(() => {
    if (!isLiveMonitoring) return

    const interval = setInterval(() => {
      refreshAllKeywords()
    }, 5 * 60 * 1000) // Refresh every 5 minutes

    return () => clearInterval(interval)
  }, [isLiveMonitoring, refreshAllKeywords])

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch sources
        const { data: sourcesData, error: sourcesError } = await supabase
          .from('sources')
          .select('*')
          .order('name')

        if (sourcesError) throw sourcesError
        setSources(sourcesData || [])

        // Fetch keywords with their timeseries data
        const { data: keywordsData, error: keywordsError } = await supabase
          .from('keywords')
          .select('id, keyword, normalized_keyword')
          .order('last_seen_at', { ascending: false })

        if (keywordsError) throw keywordsError
        const keywordsList = keywordsData as { id: string; keyword: string; normalized_keyword: string }[] | null
        setKeywordCount(keywordsList?.length || 0)

        // Fetch timeseries for each keyword and calculate trends
        const trendingData: TrendingKeyword[] = []
        let totalDataPoints = 0

        for (const kw of keywordsList || []) {
          const { data: tsData } = await supabase
            .from('keyword_timeseries')
            .select('ts, interest_value')
            .eq('keyword_id', kw.id)
            .order('ts', { ascending: true })

          if (tsData && tsData.length > 0) {
            totalDataPoints += tsData.length
            const values = tsData.map((d: { interest_value: number }) => d.interest_value)
            const current = values[values.length - 1]
            const baseline = values.slice(0, Math.floor(values.length / 2))
              .reduce((a, b) => a + b, 0) / Math.max(1, Math.floor(values.length / 2))
            const trendScore = baseline > 0
              ? ((current - baseline) / baseline) * 100
              : current

            // Use all values for sparkline to show full 7-day trend
            const sparklineData = values

            trendingData.push({
              rank: 0,
              keyword: kw.keyword,
              keyword_id: kw.id,
              trendScore: Math.round(trendScore * 10) / 10,
              currentInterest: current,
              rankChange: null,
              sparklineData,
            })
          }
        }

        setDataPoints(totalDataPoints)

        // Sort by trend score and assign ranks
        trendingData.sort((a, b) => b.trendScore - a.trendScore)
        trendingData.forEach((item, index) => {
          item.rank = index + 1
        })

        setKeywords(trendingData.slice(0, 5))
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Unable to connect to database. Please deploy the schema first.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className={cn(
          "text-3xl font-bold",
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        )}>Dashboard</h1>
        <p className={cn(
          "mt-1",
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        )}>Monitor trending niches in real-time</p>
      </div>

      {/* Connection Status */}
      {error && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-500 text-sm">{error}</p>
          <p className="text-yellow-500/70 text-xs mt-1">
            Run the SQL in /supabase/deploy/full_schema.sql in your Supabase SQL Editor
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tracked Keywords"
          value={loading ? '...' : keywordCount.toString()}
          icon={TrendingUp}
          iconColor="text-emerald-500"
        />
        <StatCard
          title="Active Missions"
          value="0"
          icon={Target}
          iconColor="text-blue-500"
        />
        <StatCard
          title="Data Points"
          value={loading ? '...' : dataPoints.toLocaleString()}
          icon={Activity}
          iconColor="text-purple-500"
        />
        <StatCard
          title="Data Sources"
          value={loading ? '...' : sources.filter(s => s.is_active).length.toString()}
          icon={Zap}
          iconColor="text-orange-500"
        />
      </div>

      {/* Data Sources */}
      {sources.length > 0 && (
        <div className={cn(
          "rounded-xl p-6",
          theme === 'dark' ? 'glass-card' : 'glass-card-light'
        )}>
          <h2 className={cn(
            "text-lg font-semibold mb-4",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>Connected Sources</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className={cn(
                  "p-3 rounded-lg border transition-all duration-200",
                  source.is_active
                    ? 'bg-emerald-500/10 border-emerald-500/20 shadow-lg shadow-emerald-500/5'
                    : theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                )}
              >
                <p className={cn(
                  "text-sm font-medium",
                  source.is_active ? 'text-emerald-400' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                )}>
                  {source.name}
                </p>
                <p className={cn(
                  "text-xs mt-1",
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                )}>
                  {source.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Now Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className={cn(
              "text-xl font-semibold",
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>Trending Now</h2>
            {/* Live Monitoring Toggle */}
            <button
              onClick={() => setIsLiveMonitoring(!isLiveMonitoring)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                isLiveMonitoring
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                  : theme === 'dark' ? 'glass-button' : 'glass-button-light'
              )}
            >
              {isLiveMonitoring ? (
                <>
                  <Pause className="h-4 w-4" />
                  Live
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Live
                </>
              )}
            </button>
            {/* Refresh All Button */}
            <button
              onClick={refreshAllKeywords}
              disabled={refreshingAll}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                refreshingAll
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                  : theme === 'dark' ? 'glass-button' : 'glass-button-light'
              )}
            >
              <RefreshCw className={cn("h-4 w-4", refreshingAll && "animate-spin")} />
              {refreshingAll ? `Refreshing ${currentRefreshIndex + 1}/${keywords.length}...` : 'Refresh All'}
            </button>
            {/* Monitor Button */}
            <button
              onClick={() => setIsMonitorOpen(true)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                monitorLogs.length > 0
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                  : theme === 'dark' ? 'glass-button' : 'glass-button-light'
              )}
            >
              <Monitor className="h-4 w-4" />
              Monitor
              {monitorLogs.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-purple-500/30 rounded-full">
                  {monitorLogs.length}
                </span>
              )}
            </button>
            {lastGlobalRefresh && (
              <span className={cn(
                "text-xs",
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              )}>
                Last refresh: {lastGlobalRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
          <Link
            to="/trending"
            className="flex items-center gap-1 text-sm text-emerald-500 hover:text-emerald-400"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className={cn(
              "text-center py-8",
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            )}>Loading trends...</div>
          ) : keywords.length === 0 ? (
            <div className={cn(
              "text-center py-8",
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            )}>
              No trending data yet. Run the ingestion script to fetch data.
            </div>
          ) : (
            keywords.map((item) => (
              <TrendCard
                key={item.keyword_id}
                rank={item.rank}
                keyword={item.keyword}
                trendScore={item.trendScore}
                currentInterest={item.currentInterest}
                rankChange={item.rankChange}
                sparklineData={item.sparklineData}
                region="US"
                source="Google Trends"
                onRefresh={() => refreshKeyword(item.keyword, item.keyword_id)}
                isRefreshing={item.isRefreshing}
                lastUpdated={item.lastUpdated}
              />
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/missions"
          className={cn(
            "rounded-xl p-6 transition-all duration-300 group hover:scale-[1.02]",
            theme === 'dark'
              ? 'glass-card hover:shadow-lg hover:shadow-emerald-500/10'
              : 'glass-card-light hover:shadow-lg hover:shadow-emerald-500/20'
          )}
        >
          <Target className="h-8 w-8 text-emerald-500 mb-3" />
          <h3 className={cn(
            "text-lg font-semibold group-hover:text-emerald-400 transition-colors",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            Create Mission
          </h3>
          <p className={cn(
            "text-sm mt-1",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          )}>
            Set up automated trend hunting
          </p>
        </Link>

        <Link
          to="/trending"
          className={cn(
            "rounded-xl p-6 transition-all duration-300 group hover:scale-[1.02]",
            theme === 'dark'
              ? 'glass-card hover:shadow-lg hover:shadow-blue-500/10'
              : 'glass-card-light hover:shadow-lg hover:shadow-blue-500/20'
          )}
        >
          <TrendingUp className="h-8 w-8 text-blue-500 mb-3" />
          <h3 className={cn(
            "text-lg font-semibold group-hover:text-blue-400 transition-colors",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            Explore Trends
          </h3>
          <p className={cn(
            "text-sm mt-1",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          )}>
            Discover what's trending now
          </p>
        </Link>

        <Link
          to="/settings"
          className={cn(
            "rounded-xl p-6 transition-all duration-300 group hover:scale-[1.02]",
            theme === 'dark'
              ? 'glass-card hover:shadow-lg hover:shadow-purple-500/10'
              : 'glass-card-light hover:shadow-lg hover:shadow-purple-500/20'
          )}
        >
          <Zap className="h-8 w-8 text-purple-500 mb-3" />
          <h3 className={cn(
            "text-lg font-semibold group-hover:text-purple-400 transition-colors",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            Configure Sources
          </h3>
          <p className={cn(
            "text-sm mt-1",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          )}>
            Manage data source connections
          </p>
        </Link>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Live Monitor Panel */}
      <LiveMonitorPanel
        isOpen={isMonitorOpen}
        onClose={() => setIsMonitorOpen(false)}
        logs={monitorLogs}
        isRefreshing={refreshingAll || keywords.some(k => k.isRefreshing)}
        currentKeyword={currentRefreshingKeyword}
      />
    </div>
  )
}
