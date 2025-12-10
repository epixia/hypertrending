import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, TrendingUp, TrendingDown, Minus, MapPin, ExternalLink, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

const API_BASE = 'http://localhost:8892'

const regions = [
  { code: '', name: 'Worldwide' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'JP', name: 'Japan' },
  { code: 'AU', name: 'Australia' },
]

interface TrendData {
  keyword: string
  keyword_id: string
  current_interest: number
  trend_score: number
  sparkline: number[]
  last_updated: string
  data_points: number
}

interface InterestPoint {
  date: string
  value: number
}

type SortOption = 'trendScore' | 'interest'

export function Trending() {
  const { theme } = useTheme()
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [selectedRegion, setSelectedRegion] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('trendScore')

  const [trends, setTrends] = useState<TrendData[]>([])
  const [selectedTrend, setSelectedTrend] = useState<TrendData | null>(null)
  const [interestOverTime, setInterestOverTime] = useState<InterestPoint[]>([])

  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all trends on mount
  useEffect(() => {
    fetchAllTrends()
  }, [])

  // Auto-search if query param is provided
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery)
    }
  }, [initialQuery])

  const fetchAllTrends = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/api/trends`)
      if (!response.ok) throw new Error('Failed to fetch trends')
      const data = await response.json()
      setTrends(data.trends || [])
      if (data.trends?.length > 0 && !selectedTrend) {
        setSelectedTrend(data.trends[0])
        setInterestOverTime(convertSparklineToPoints(data.trends[0].sparkline))
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return

    setIsSearching(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/api/refresh-trend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: query.trim(),
          region: selectedRegion
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to fetch trend data')
      }

      const data = await response.json()

      const newTrend: TrendData = {
        keyword: data.keyword,
        keyword_id: data.keyword_id,
        current_interest: data.current_interest,
        trend_score: data.trend_score,
        sparkline: data.sparkline,
        last_updated: data.last_updated,
        data_points: data.data_points
      }

      // Add to trends list if not already present
      setTrends(prev => {
        const exists = prev.find(t => t.keyword_id === newTrend.keyword_id)
        if (exists) {
          return prev.map(t => t.keyword_id === newTrend.keyword_id ? newTrend : t)
        }
        return [newTrend, ...prev]
      })

      setSelectedTrend(newTrend)
      setInterestOverTime(convertSparklineToPoints(newTrend.sparkline))

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSearching(false)
    }
  }, [selectedRegion])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery)
    }
  }

  const convertSparklineToPoints = (sparkline: number[]): InterestPoint[] => {
    const now = new Date()
    return sparkline.map((value, index) => {
      const date = new Date(now)
      date.setHours(date.getHours() - (sparkline.length - 1 - index) * 4) // Assuming ~4 hour intervals for 7 days
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value
      }
    })
  }

  const sortedTrends = [...trends].sort((a, b) => {
    switch (sortBy) {
      case 'trendScore':
        return b.trend_score - a.trend_score
      case 'interest':
        return b.current_interest - a.current_interest
      default:
        return 0
    }
  })

  const getTrendDirection = (score: number) => {
    if (score > 10) return { icon: <TrendingUp className="h-3 w-3" />, class: 'trend-badge-up' }
    if (score < -10) return { icon: <TrendingDown className="h-3 w-3" />, class: 'trend-badge-down' }
    return { icon: <Minus className="h-3 w-3" />, class: 'trend-badge-neutral' }
  }

  // Simple sparkline component
  const Sparkline = ({ data, color = '#10b981' }: { data: number[], color?: string }) => {
    if (!data || data.length < 2) return null
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    const width = 80
    const height = 32
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * height
      return `${x},${y}`
    }).join(' ')

    return (
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={`sparkGradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={`url(#sparkGradient-${color.replace('#', '')})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  // Get unique dates for x-axis (reduce to ~7 labels)
  const getXAxisLabels = () => {
    if (interestOverTime.length === 0) return []
    const step = Math.max(1, Math.floor(interestOverTime.length / 7))
    return interestOverTime.filter((_, i) => i % step === 0 || i === interestOverTime.length - 1)
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={cn(
            "text-3xl font-bold",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>Explore Trends</h1>
          <p className={cn(
            "mt-1",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          )}>See what the world is searching for</p>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-96">
            <Search className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5",
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            )} />
            <input
              type="text"
              placeholder="Enter a search term or topic"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "w-full pl-12 pr-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all",
                theme === 'dark'
                  ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500'
                  : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 shadow-sm'
              )}
            />
          </div>

          {/* Search button */}
          <button
            onClick={() => handleSearch(searchQuery)}
            disabled={isSearching || !searchQuery.trim()}
            className={cn(
              "px-4 py-3 rounded-full font-medium transition-all whitespace-nowrap flex items-center gap-2",
              "bg-emerald-500 text-white hover:bg-emerald-600",
              (isSearching || !searchQuery.trim()) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </button>

          {/* Google Trends Debug Link */}
          {searchQuery && (
            <a
              href={`https://trends.google.com/trends/explore?date=now%207-d&geo=${selectedRegion}&q=${encodeURIComponent(searchQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                theme === 'dark'
                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
              )}
              title="Open in Google Trends"
            >
              <ExternalLink className="h-4 w-4" />
              Google Trends
            </a>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Region Chips */}
        <div className="flex items-center gap-2">
          <MapPin className={cn(
            "h-4 w-4",
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          )} />
          <div className="flex flex-wrap gap-2">
            {regions.map((region) => (
              <button
                key={region.code}
                onClick={() => setSelectedRegion(region.code)}
                className={cn(
                  'chip',
                  theme === 'dark' ? 'chip-dark' : 'chip-light',
                  selectedRegion === region.code && 'active'
                )}
              >
                {region.code === '' ? region.name : region.code}
              </button>
            ))}
          </div>
        </div>

        <div className={cn(
          "w-px h-6",
          theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'
        )} />

        {/* Refresh button */}
        <button
          onClick={fetchAllTrends}
          disabled={isLoading}
          className={cn(
            'chip flex items-center gap-2',
            theme === 'dark' ? 'chip-dark' : 'chip-light'
          )}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {/* Main Content - Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interest Over Time Chart - Takes 2 columns */}
        <div className={cn(
          "lg:col-span-2 chart-card p-6",
          theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
        )}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={cn(
              "text-lg font-semibold",
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>Interest over time</h2>
            {selectedTrend && (
              <span className="comparison-chip comparison-chip-blue">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {selectedTrend.keyword}
              </span>
            )}
          </div>

          {/* Chart Area */}
          <div className="h-64 relative">
            {interestOverTime.length > 0 ? (
              <>
                <svg className="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={200 - y * 2}
                      x2="700"
                      y2={200 - y * 2}
                      stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                      strokeDasharray="4"
                    />
                  ))}
                  {/* Area fill */}
                  <path
                    d={`M0,200 L0,${200 - interestOverTime[0].value * 2} ${interestOverTime.map((d, i) =>
                      `L${(i / (interestOverTime.length - 1)) * 700},${200 - d.value * 2}`
                    ).join(' ')} L700,200 Z`}
                    fill="url(#areaGradient)"
                  />
                  {/* Line */}
                  <path
                    d={`M${interestOverTime.map((d, i) =>
                      `${(i / (interestOverTime.length - 1)) * 700},${200 - d.value * 2}`
                    ).join(' L')}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Data points - only show on hover or at key points */}
                  {interestOverTime.map((d, i) => (
                    <circle
                      key={i}
                      cx={(i / (interestOverTime.length - 1)) * 700}
                      cy={200 - d.value * 2}
                      r="3"
                      fill="#3b82f6"
                      className="opacity-0 hover:opacity-100 transition-opacity"
                    />
                  ))}
                </svg>
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs">
                  {[100, 75, 50, 25, 0].map((v) => (
                    <span key={v} className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>{v}</span>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className={cn(
                  "text-sm",
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                )}>
                  {isSearching ? 'Loading...' : 'Search for a keyword to see trend data'}
                </p>
              </div>
            )}
          </div>

          {/* X-axis labels */}
          {interestOverTime.length > 0 && (
            <div className="flex justify-between mt-2 text-xs">
              {getXAxisLabels().map((d, i) => (
                <span key={i} className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>{d.date}</span>
              ))}
            </div>
          )}
        </div>

        {/* Stats Panel - 1 column */}
        <div className={cn(
          "chart-card p-6",
          theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
        )}>
          <h2 className={cn(
            "text-lg font-semibold mb-4",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>Current Stats</h2>

          {selectedTrend ? (
            <div className="space-y-4">
              <div className={cn(
                "p-4 rounded-lg",
                theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
              )}>
                <p className={cn(
                  "text-sm",
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                )}>Current Interest</p>
                <p className={cn(
                  "text-3xl font-bold",
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>{selectedTrend.current_interest}</p>
              </div>

              <div className={cn(
                "p-4 rounded-lg",
                theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
              )}>
                <p className={cn(
                  "text-sm",
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                )}>Trend Score</p>
                <p className={cn(
                  "text-3xl font-bold",
                  selectedTrend.trend_score > 0 ? 'text-emerald-500' :
                  selectedTrend.trend_score < 0 ? 'text-red-500' :
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>
                  {selectedTrend.trend_score > 0 ? '+' : ''}{selectedTrend.trend_score.toFixed(1)}%
                </p>
              </div>

              <div className={cn(
                "p-4 rounded-lg",
                theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
              )}>
                <p className={cn(
                  "text-sm",
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                )}>Data Points</p>
                <p className={cn(
                  "text-3xl font-bold",
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>{selectedTrend.data_points}</p>
              </div>

              <p className={cn(
                "text-xs",
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              )}>
                Last updated: {new Date(selectedTrend.last_updated).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className={cn(
              "text-sm",
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            )}>Select a keyword to view stats</p>
          )}
        </div>
      </div>

      {/* Trending Keywords List */}
      <div className={cn(
        "chart-card p-6",
        theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <h2 className={cn(
              "text-lg font-semibold",
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>Tracked Keywords</h2>
            <span className={cn(
              "text-sm",
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            )}>({trends.length})</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className={cn(
              "text-sm rounded-full px-3 py-1.5",
              theme === 'dark'
                ? 'bg-white/5 text-gray-300 border border-white/10'
                : 'bg-gray-100 text-gray-700 border border-gray-200'
            )}
          >
            <option value="trendScore">Trend Score</option>
            <option value="interest">Interest</option>
          </select>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : sortedTrends.length > 0 ? (
            sortedTrends.map((item, index) => {
              const trendDir = getTrendDirection(item.trend_score)
              return (
                <button
                  key={item.keyword_id}
                  onClick={() => {
                    setSelectedTrend(item)
                    setInterestOverTime(convertSparklineToPoints(item.sparkline))
                  }}
                  className={cn(
                    "w-full related-card flex items-center gap-4",
                    theme === 'dark' ? 'related-card-dark' : 'related-card-light',
                    selectedTrend?.keyword_id === item.keyword_id && (theme === 'dark'
                      ? 'ring-1 ring-emerald-500/50 bg-emerald-500/10'
                      : 'ring-1 ring-emerald-500/50 bg-emerald-50'),
                    `animate-fade-in animate-delay-${Math.min(index + 1, 5)}`
                  )}
                >
                  {/* Rank */}
                  <span className={cn(
                    "w-6 text-center font-bold",
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  )}>{index + 1}</span>

                  {/* Keyword info */}
                  <div className="flex-1 text-left">
                    <span className={cn(
                      "font-medium",
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    )}>{item.keyword}</span>
                    <span className={cn(
                      "text-xs block",
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    )}>Score: {item.trend_score.toFixed(1)}%</span>
                  </div>

                  {/* Sparkline */}
                  <div className="hidden sm:block">
                    <Sparkline
                      data={item.sparkline}
                      color={item.trend_score > 0 ? '#22c55e' : '#3b82f6'}
                    />
                  </div>

                  {/* Interest bar */}
                  <div className="w-20">
                    <div className={cn(
                      "interest-bar-container",
                      theme === 'dark' ? 'interest-bar-container-dark' : 'interest-bar-container-light'
                    )}>
                      <div
                        className="interest-bar"
                        style={{ width: `${item.current_interest}%` }}
                      />
                    </div>
                  </div>

                  {/* Trend badge */}
                  <span className={cn("trend-badge", trendDir.class)}>
                    {trendDir.icon}
                    {Math.abs(item.trend_score).toFixed(0)}%
                  </span>
                </button>
              )
            })
          ) : (
            <div className="text-center py-8">
              <p className={cn(
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              )}>No keywords tracked yet. Search for a keyword to start tracking.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
