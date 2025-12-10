import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, DollarSign, Globe, User, Tag, Play, FileText, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

const API_URL = 'http://localhost:8892'

interface SaasApp {
  id: string
  name: string
  slug: string
  description: string | null
  mrr: number | null
  arr: number | null
  website_url: string | null
  founder_name: string | null
  category: string | null
  youtube_video_id: string | null
  youtube_title: string | null
  youtube_transcript: string | null
  tech_stack: string[] | null
  target_market: string | null
  key_metrics: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export function SaasDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { theme } = useTheme()
  const [app, setApp] = useState<SaasApp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchingTranscript, setFetchingTranscript] = useState(false)
  const [extractingInfo, setExtractingInfo] = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  useEffect(() => {
    fetchApp()
  }, [slug])

  const fetchApp = async () => {
    if (!slug) return

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/saas/${slug}`)
      if (!response.ok) {
        throw new Error('SaaS app not found')
      }
      const data = await response.json()
      setApp(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load app')
    } finally {
      setLoading(false)
    }
  }

  const handleFetchTranscript = async () => {
    if (!slug) return

    try {
      setFetchingTranscript(true)
      const response = await fetch(`${API_URL}/api/saas/${slug}/fetch-transcript`, {
        method: 'POST'
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to fetch transcript')
      }
      await fetchApp() // Refresh the app data
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to fetch transcript')
    } finally {
      setFetchingTranscript(false)
    }
  }

  const handleExtractInfo = async () => {
    if (!slug) return

    try {
      setExtractingInfo(true)
      const response = await fetch(`${API_URL}/api/saas/${slug}/extract-info`, {
        method: 'POST'
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to extract info')
      }
      await fetchApp() // Refresh the app data
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to extract info')
    } finally {
      setExtractingInfo(false)
    }
  }

  const formatMRR = (value: number | null) => {
    if (!value) return 'N/A'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error || !app) {
    return (
      <div className="space-y-6">
        <Link
          to="/saas"
          className={cn(
            "inline-flex items-center gap-2 text-sm",
            theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SaaS Directory
        </Link>
        <div className={cn(
          "chart-card p-8 text-center",
          theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
        )}>
          <p className={cn(
            "text-lg",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          )}>{error || 'App not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/saas"
        className={cn(
          "inline-flex items-center gap-2 text-sm",
          theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
        )}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to SaaS Directory
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className={cn(
              "text-3xl font-bold",
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>{app.name}</h1>
            {app.category && (
              <span className={cn(
                "px-3 py-1 rounded-full text-sm",
                theme === 'dark'
                  ? 'bg-white/10 text-gray-300'
                  : 'bg-gray-100 text-gray-600'
              )}>
                {app.category}
              </span>
            )}
          </div>
          {app.description && (
            <p className={cn(
              "mt-2 text-lg",
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            )}>{app.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {app.youtube_video_id && !app.youtube_transcript && (
            <button
              onClick={handleFetchTranscript}
              disabled={fetchingTranscript}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                "bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              )}
            >
              {fetchingTranscript ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Fetch Transcript
            </button>
          )}
          {app.youtube_transcript && (
            <button
              onClick={handleExtractInfo}
              disabled={extractingInfo}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                "bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
              )}
            >
              {extractingInfo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Extract with AI
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={cn(
          "chart-card p-4",
          theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
        )}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <span className={cn(
              "text-sm",
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            )}>MRR</span>
          </div>
          <p className={cn(
            "text-2xl font-bold",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>{formatMRR(app.mrr)}</p>
        </div>

        <div className={cn(
          "chart-card p-4",
          theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
        )}>
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-blue-500" />
            <span className={cn(
              "text-sm",
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            )}>Founder</span>
          </div>
          <p className={cn(
            "text-lg font-semibold truncate",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>{app.founder_name || 'N/A'}</p>
        </div>

        {app.website_url && (
          <div className={cn(
            "chart-card p-4",
            theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-4 w-4 text-purple-500" />
              <span className={cn(
                "text-sm",
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              )}>Website</span>
            </div>
            <a
              href={app.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:underline truncate block"
            >
              {app.website_url.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}

        {app.target_market && (
          <div className={cn(
            "chart-card p-4",
            theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Tag className="h-4 w-4 text-orange-500" />
              <span className={cn(
                "text-sm",
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              )}>Target Market</span>
            </div>
            <p className={cn(
              "text-sm truncate",
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>{app.target_market}</p>
          </div>
        )}
      </div>

      {/* Tech Stack */}
      {app.tech_stack && app.tech_stack.length > 0 && (
        <div className={cn(
          "chart-card p-6",
          theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
        )}>
          <h2 className={cn(
            "text-lg font-semibold mb-3",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>Tech Stack</h2>
          <div className="flex flex-wrap gap-2">
            {app.tech_stack.map((tech, index) => (
              <span
                key={index}
                className={cn(
                  "px-3 py-1 rounded-full text-sm",
                  theme === 'dark'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-emerald-50 text-emerald-600'
                )}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Video Section */}
      {app.youtube_video_id && (
        <div className={cn(
          "chart-card overflow-hidden",
          theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
        )}>
          <div className={cn(
            "p-4 border-b",
            theme === 'dark' ? 'border-white/10' : 'border-gray-200'
          )}>
            <h2 className={cn(
              "text-lg font-semibold flex items-center gap-2",
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>
              <Play className="h-5 w-5 text-red-500" />
              Starter Story Video
            </h2>
          </div>

          {showVideo ? (
            <div className="aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${app.youtube_video_id}?autoplay=1`}
                title={app.youtube_title || app.name}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <button
              onClick={() => setShowVideo(true)}
              className="relative w-full aspect-video group"
            >
              <img
                src={`https://img.youtube.com/vi/${app.youtube_video_id}/maxresdefault.jpg`}
                alt={app.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-all flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="h-10 w-10 text-white ml-1" fill="white" />
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Transcript Section */}
      {app.youtube_transcript && (
        <div className={cn(
          "chart-card p-6",
          theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
        )}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={cn(
              "text-lg font-semibold flex items-center gap-2",
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>
              <FileText className="h-5 w-5 text-blue-500" />
              Video Transcript
            </h2>
            <button
              onClick={handleFetchTranscript}
              disabled={fetchingTranscript}
              className={cn(
                "flex items-center gap-1 text-sm px-3 py-1 rounded-lg transition-all",
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-white/10'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <RefreshCw className={cn("h-4 w-4", fetchingTranscript && "animate-spin")} />
              Refresh
            </button>
          </div>
          <div className={cn(
            "max-h-96 overflow-y-auto p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap",
            theme === 'dark'
              ? 'bg-black/30 text-gray-300'
              : 'bg-gray-50 text-gray-700'
          )}>
            {app.youtube_transcript}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {app.key_metrics && Object.keys(app.key_metrics).length > 0 && (
        <div className={cn(
          "chart-card p-6",
          theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
        )}>
          <h2 className={cn(
            "text-lg font-semibold mb-4",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>Key Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(app.key_metrics).map(([key, value]) => (
              <div key={key}>
                <p className={cn(
                  "text-sm",
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                )}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                <p className={cn(
                  "text-lg font-semibold",
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
