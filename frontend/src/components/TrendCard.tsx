import { TrendingUp, TrendingDown, Minus, Sparkles, ExternalLink, RefreshCw } from 'lucide-react'
import { cn, getTrendColor, getTrendBgColor } from '../lib/utils'
import { Sparkline } from './Sparkline'
import { useTheme } from '../contexts/ThemeContext'

interface TrendCardProps {
  rank: number
  keyword: string
  trendScore: number
  currentInterest: number
  rankChange?: number | null
  sparklineData?: number[]
  region?: string
  source?: string
  onClick?: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
  lastUpdated?: Date | null
}

function getGoogleTrendsUrl(keyword: string): string {
  const encoded = encodeURIComponent(keyword)
  return `https://trends.google.com/trends/explore?date=now%207-d&geo=US&q=${encoded}`
}

function formatTimeAgo(date: Date | null | undefined): string {
  if (!date) return ''
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function TrendCard({
  rank,
  keyword,
  trendScore,
  currentInterest,
  rankChange,
  sparklineData,
  region,
  source,
  onClick,
  onRefresh,
  isRefreshing,
  lastUpdated,
}: TrendCardProps) {
  const { theme } = useTheme()
  const isNew = rankChange === null
  const isUp = rankChange && rankChange > 0
  const isDown = rankChange && rankChange < 0

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl p-4 transition-all duration-300 cursor-pointer relative overflow-hidden',
        theme === 'dark' ? 'glass-card hover:bg-white/[0.08]' : 'glass-card-light hover:bg-black/[0.04]',
        onClick && 'hover:scale-[1.01]',
        isRefreshing && 'ring-1 ring-blue-500/50'
      )}
    >
      {/* Refresh progress indicator */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-blue-500/5 pointer-events-none">
          <div className="absolute top-0 left-0 h-1 bg-blue-500 animate-pulse w-full" />
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg border border-blue-500/30">
              <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
              <span className="text-sm text-blue-400">Fetching from Google Trends...</span>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-start gap-4">
        {/* Rank */}
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-white">#{rank}</span>
          {isNew ? (
            <span className="flex items-center gap-1 text-xs text-emerald-500">
              <Sparkles className="h-3 w-3" />
              NEW
            </span>
          ) : isUp ? (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <TrendingUp className="h-3 w-3" />
              +{rankChange}
            </span>
          ) : isDown ? (
            <span className="flex items-center gap-1 text-xs text-red-500">
              <TrendingDown className="h-3 w-3" />
              {rankChange}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Minus className="h-3 w-3" />
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white truncate">{keyword}</h3>
            <a
              href={getGoogleTrendsUrl(keyword)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-500 hover:text-emerald-400 transition-colors"
              title="View on Google Trends"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            {onRefresh && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRefresh()
                }}
                disabled={isRefreshing}
                className={cn(
                  "text-gray-500 hover:text-blue-400 transition-colors disabled:opacity-50",
                  isRefreshing && "animate-spin"
                )}
                title="Refresh this trend"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            {lastUpdated && (
              <span className="text-xs text-gray-600" title={lastUpdated.toLocaleString()}>
                {formatTimeAgo(lastUpdated)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {region && (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded",
                theme === 'dark' ? 'text-gray-400 bg-white/5' : 'text-gray-500 bg-black/5'
              )}>
                {region}
              </span>
            )}
            {source && (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded",
                theme === 'dark' ? 'text-gray-400 bg-white/5' : 'text-gray-500 bg-black/5'
              )}>
                {source}
              </span>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="flex flex-col items-end gap-2">
          <div
            className={cn(
              'px-3 py-1 rounded-full text-sm font-semibold',
              getTrendBgColor(trendScore),
              getTrendColor(trendScore)
            )}
          >
            {trendScore > 0 ? '+' : ''}{trendScore.toFixed(1)}%
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs",
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              )}>Interest:</span>
              <span className="text-lg font-bold text-emerald-400">{currentInterest}</span>
            </div>
            <div className={cn(
              "h-1.5 w-20 rounded-full overflow-hidden",
              theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
            )}>
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all shadow-lg shadow-emerald-500/30"
                style={{ width: `${currentInterest}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-4 h-12">
          <Sparkline data={sparklineData} />
        </div>
      )}
    </div>
  )
}
