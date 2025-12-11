import { useEffect, useRef } from 'react'
import { X, Activity, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'
import type { LogEntry } from '../types/monitor'

interface LiveMonitorPanelProps {
  isOpen: boolean
  onClose: () => void
  logs: LogEntry[]
  isRefreshing: boolean
  currentKeyword?: string
}

export function LiveMonitorPanel({
  isOpen,
  onClose,
  logs,
  isRefreshing,
  currentKeyword
}: LiveMonitorPanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  if (!isOpen) return null

  const getIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-400" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-400" />
      case 'fetch':
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatChange = (current: number, previous: number) => {
    const diff = current - previous
    if (diff > 0) return <span className="text-emerald-400">+{diff}</span>
    if (diff < 0) return <span className="text-red-400">{diff}</span>
    return <span className="text-gray-500">0</span>
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Activity className={cn("h-5 w-5", isRefreshing ? "text-emerald-400 animate-pulse" : "text-gray-400")} />
          <h2 className="text-lg font-semibold text-white">Live Monitor</h2>
          {isRefreshing && (
            <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
              Active
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Current Status */}
      {isRefreshing && currentKeyword && (
        <div className="p-4 bg-blue-500/10 border-b border-blue-500/20">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
            <span className="text-blue-400 text-sm">
              Fetching: <strong>{currentKeyword}</strong>
            </span>
          </div>
          <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {logs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No activity yet</p>
            <p className="text-xs mt-1">Click refresh to start monitoring</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={cn(
                "p-3 rounded-lg border",
                log.type === 'success' && "bg-emerald-500/5 border-emerald-500/20",
                log.type === 'error' && "bg-red-500/5 border-red-500/20",
                log.type === 'fetch' && "bg-blue-500/5 border-blue-500/20",
                log.type === 'info' && "bg-gray-800/50 border-gray-700"
              )}
            >
              {/* Log Header */}
              <div className="flex items-start gap-2">
                {getIcon(log.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    {log.keyword && (
                      <span className="font-medium text-white text-sm truncate">
                        {log.keyword}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{log.message}</p>
                </div>
              </div>

              {/* Details */}
              {log.details && (
                <div className="mt-3 pt-3 border-t border-gray-700/50 grid grid-cols-2 gap-2 text-xs">
                  {log.details.currentInterest !== undefined && (
                    <div className="bg-gray-800/50 rounded p-2">
                      <div className="text-gray-500">Interest</div>
                      <div className="text-white font-medium flex items-center gap-1">
                        {log.details.currentInterest}
                        {log.details.previousInterest !== undefined && (
                          <span className="text-xs">
                            ({formatChange(log.details.currentInterest, log.details.previousInterest)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {log.details.trendScore !== undefined && (
                    <div className="bg-gray-800/50 rounded p-2">
                      <div className="text-gray-500">Trend</div>
                      <div className={cn(
                        "font-medium flex items-center gap-1",
                        log.details.trendScore > 0 ? "text-emerald-400" : log.details.trendScore < 0 ? "text-red-400" : "text-gray-400"
                      )}>
                        {log.details.trendScore > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {log.details.trendScore > 0 ? '+' : ''}{log.details.trendScore}%
                      </div>
                    </div>
                  )}
                  {log.details.dataPoints !== undefined && (
                    <div className="bg-gray-800/50 rounded p-2">
                      <div className="text-gray-500">Data Points</div>
                      <div className="text-white font-medium">{log.details.dataPoints}</div>
                    </div>
                  )}
                  {log.details.duration !== undefined && (
                    <div className="bg-gray-800/50 rounded p-2">
                      <div className="text-gray-500">Duration</div>
                      <div className="text-white font-medium">{log.details.duration}ms</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="text-gray-500">Total</div>
            <div className="text-white font-medium">{logs.length}</div>
          </div>
          <div>
            <div className="text-gray-500">Success</div>
            <div className="text-emerald-400 font-medium">
              {logs.filter(l => l.type === 'success').length}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Errors</div>
            <div className="text-red-400 font-medium">
              {logs.filter(l => l.type === 'error').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
