export interface LogEntry {
  id: string
  timestamp: Date
  type: 'info' | 'success' | 'error' | 'fetch'
  keyword?: string
  message: string
  details?: {
    currentInterest?: number
    previousInterest?: number
    trendScore?: number
    previousTrendScore?: number
    dataPoints?: number
    duration?: number
  }
}
