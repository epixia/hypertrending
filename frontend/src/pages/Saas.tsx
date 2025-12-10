import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, ExternalLink, TrendingUp, Building2, Plus, Play, X, Loader2, Upload, Youtube, CheckCircle, XCircle, SkipForward, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Globe, User, Search, Calendar } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

const API_URL = 'http://localhost:8892'

interface SaasApp {
  id: string
  name: string
  slug: string
  mrr: number | null
  description: string | null
  youtube_video_id: string | null
  youtube_title: string | null
  category: string | null
  niche: string | null
  website_url: string | null
  founder_name: string | null
  youtube_published_at: string | null
  created_at: string | null
}

interface ImportResult {
  video_id: string
  title: string
  slug?: string
  mrr?: number
  reason?: string
  error?: string
}

interface ChannelImportResults {
  imported: ImportResult[]
  skipped: ImportResult[]
  failed: ImportResult[]
}

type SortField = 'mrr' | 'name' | 'category' | 'niche' | 'founder_name' | 'published_at'
type SortDirection = 'asc' | 'desc'

export function Saas() {
  const { theme } = useTheme()
  const [saasApps, setSaasApps] = useState<SaasApp[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('mrr')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showChannelImport, setShowChannelImport] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<SaasApp | null>(null)
  const [importing, setImporting] = useState(false)
  const [channelImporting, setChannelImporting] = useState(false)
  const [channelUrl, setChannelUrl] = useState('https://www.youtube.com/@starterstory')
  const [videoLimit, setVideoLimit] = useState(50)
  const [importResults, setImportResults] = useState<ChannelImportResults | null>(null)
  const [newApp, setNewApp] = useState({
    name: '',
    mrr: '',
    description: '',
    youtubeId: '',
    category: '',
  })

  useEffect(() => {
    fetchApps()
  }, [])

  const fetchApps = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/saas`)
      const data = await response.json()
      setSaasApps(data.apps || [])
    } catch (error) {
      console.error('Failed to fetch SaaS apps:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter apps by search query
  const filteredApps = saasApps.filter((app) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      app.name.toLowerCase().includes(query) ||
      (app.description?.toLowerCase().includes(query)) ||
      (app.category?.toLowerCase().includes(query)) ||
      (app.niche?.toLowerCase().includes(query)) ||
      (app.founder_name?.toLowerCase().includes(query))
    )
  })

  const sortedApps = [...filteredApps].sort((a, b) => {
    let comparison = 0

    switch (sortField) {
      case 'mrr':
        comparison = (a.mrr || 0) - (b.mrr || 0)
        break
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'category':
        comparison = (a.category || '').localeCompare(b.category || '')
        break
      case 'niche':
        comparison = (a.niche || '').localeCompare(b.niche || '')
        break
      case 'founder_name':
        comparison = (a.founder_name || '').localeCompare(b.founder_name || '')
        break
      case 'published_at':
        const dateA = a.youtube_published_at || a.created_at || ''
        const dateB = b.youtube_published_at || b.created_at || ''
        comparison = dateA.localeCompare(dateB)
        break
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Pagination
  const totalPages = Math.ceil(sortedApps.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedApps = sortedApps.slice(startIndex, endIndex)

  // Reset to page 1 when sorting changes
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'mrr' ? 'desc' : 'asc')
    }
    setCurrentPage(1)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="h-4 w-4 opacity-30" />
    }
    return sortDirection === 'asc'
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />
  }

  const totalMRR = saasApps.reduce((sum, app) => sum + (app.mrr || 0), 0)

  const handleAddApp = async () => {
    if (!newApp.name) return

    try {
      const response = await fetch(`${API_URL}/api/saas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newApp.name,
          mrr: newApp.mrr ? parseInt(newApp.mrr.replace(/[^0-9]/g, '')) : null,
          description: newApp.description || null,
          youtube_video_id: newApp.youtubeId || null,
          category: newApp.category || null,
        })
      })

      if (response.ok) {
        setNewApp({ name: '', mrr: '', description: '', youtubeId: '', category: '' })
        setShowAddForm(false)
        fetchApps()
      }
    } catch (error) {
      console.error('Failed to add app:', error)
    }
  }

  const handleImportFromYoutube = async () => {
    if (!newApp.youtubeId) return

    try {
      setImporting(true)
      const response = await fetch(`${API_URL}/api/saas/import-from-youtube`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_video_id: newApp.youtubeId })
      })

      if (response.ok) {
        setNewApp({ name: '', mrr: '', description: '', youtubeId: '', category: '' })
        setShowAddForm(false)
        fetchApps()
      } else {
        const data = await response.json()
        alert(data.detail || 'Failed to import')
      }
    } catch (error) {
      console.error('Failed to import:', error)
    } finally {
      setImporting(false)
    }
  }

  const handleChannelImport = async () => {
    if (!channelUrl) return

    try {
      setChannelImporting(true)
      setImportResults(null)
      const response = await fetch(`${API_URL}/api/channel/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_url: channelUrl,
          limit: videoLimit,
          analyze: true
        })
      })

      const data = await response.json()

      if (response.ok) {
        setImportResults(data.results)
        fetchApps()
      } else {
        alert(data.detail || 'Failed to import channel')
      }
    } catch (error) {
      console.error('Failed to import channel:', error)
      alert('Failed to import channel')
    } finally {
      setChannelImporting(false)
    }
  }

  const formatMRR = (value: number | null) => {
    if (!value) return '$0'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getYoutubeThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
  }

  return (
    <div className="space-y-6">
      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedVideo(null)}
          />
          <div className={cn(
            "relative w-full max-w-4xl",
            theme === 'dark' ? 'glass-modal' : 'glass-modal-light'
          )}>
            <div className={cn(
              "flex items-center justify-between p-4 border-b",
              theme === 'dark' ? 'border-white/10' : 'border-black/10'
            )}>
              <div>
                <h3 className={cn(
                  "font-semibold",
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>{selectedVideo.name}</h3>
                <p className="text-emerald-500 font-medium">{formatMRR(selectedVideo.mrr)}/month MRR</p>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-white/10'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'
                )}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${selectedVideo.youtube_video_id}?autoplay=1`}
                title={selectedVideo.youtube_title || selectedVideo.name}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-b-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={cn(
            "text-3xl font-bold",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>SaaS Directory</h1>
          <p className={cn(
            "mt-1",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          )}>Curated list of SaaS apps with publicly stated MRR</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setShowChannelImport(!showChannelImport); setShowAddForm(false) }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all",
              showChannelImport
                ? "bg-red-500 text-white"
                : theme === 'dark'
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : "bg-red-50 text-red-600 hover:bg-red-100"
            )}
          >
            <Youtube className="h-4 w-4" />
            Import Channel
          </button>
          <button
            onClick={() => { setShowAddForm(!showAddForm); setShowChannelImport(false) }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all",
              "bg-emerald-500 text-white hover:bg-emerald-600"
            )}
          >
            <Plus className="h-4 w-4" />
            Add App
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cn(
          "chart-card p-6",
          theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
        )}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-emerald-500/20">
              <DollarSign className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className={cn(
                "text-sm",
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              )}>Total MRR Tracked</p>
              <p className={cn(
                "text-2xl font-bold",
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              )}>{formatMRR(totalMRR)}</p>
            </div>
          </div>
        </div>

        <div className={cn(
          "chart-card p-6",
          theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
        )}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-500/20">
              <Building2 className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className={cn(
                "text-sm",
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              )}>Apps Tracked</p>
              <p className={cn(
                "text-2xl font-bold",
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              )}>{saasApps.length}</p>
            </div>
          </div>
        </div>

        <div className={cn(
          "chart-card p-6",
          theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
        )}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-purple-500/20">
              <TrendingUp className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className={cn(
                "text-sm",
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              )}>Average MRR</p>
              <p className={cn(
                "text-2xl font-bold",
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              )}>{formatMRR(saasApps.length > 0 ? Math.round(totalMRR / saasApps.length) : 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Import Form */}
      {showChannelImport && (
        <div className={cn(
          "chart-card p-6",
          theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
        )}>
          <h3 className={cn(
            "text-lg font-semibold mb-4 flex items-center gap-2",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            <Youtube className="h-5 w-5 text-red-500" />
            Import from YouTube Channel
          </h3>

          <div className="space-y-4">
            <div>
              <label className={cn(
                "block text-sm font-medium mb-2",
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              )}>
                Channel URL
              </label>
              <input
                type="text"
                placeholder="https://www.youtube.com/@channelname"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                className={cn(
                  "w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500",
                  theme === 'dark'
                    ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500'
                    : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                )}
              />
              <p className={cn(
                "text-xs mt-1",
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              )}>
                Supports: @username, /channel/ID, /c/name, /user/name formats
              </p>
            </div>

            <div>
              <label className={cn(
                "block text-sm font-medium mb-2",
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              )}>
                Number of Videos to Import
              </label>
              <select
                value={videoLimit}
                onChange={(e) => setVideoLimit(parseInt(e.target.value))}
                className={cn(
                  "px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500",
                  theme === 'dark'
                    ? 'bg-white/5 border border-white/10 text-white'
                    : 'bg-gray-50 border border-gray-200 text-gray-900'
                )}
              >
                <option value={10}>10 videos</option>
                <option value={20}>20 videos</option>
                <option value={50}>50 videos</option>
                <option value={100}>100 videos</option>
                <option value={200}>200 videos (slow)</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleChannelImport}
                disabled={channelImporting || !channelUrl}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all",
                  "bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                )}
              >
                {channelImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Start Import
                  </>
                )}
              </button>
              <button
                onClick={() => { setShowChannelImport(false); setImportResults(null) }}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all",
                  theme === 'dark'
                    ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Cancel
              </button>
            </div>

            {channelImporting && (
              <div className={cn(
                "p-4 rounded-lg",
                theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
              )}>
                <p className={cn(
                  "text-sm",
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                )}>
                  Fetching videos, extracting transcripts, and analyzing with AI. This may take several minutes...
                </p>
              </div>
            )}

            {/* Import Results */}
            {importResults && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className={cn(
                    "p-4 rounded-lg text-center",
                    theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-50'
                  )}>
                    <CheckCircle className="h-6 w-6 mx-auto mb-1 text-emerald-500" />
                    <p className="text-2xl font-bold text-emerald-500">{importResults.imported.length}</p>
                    <p className={cn("text-sm", theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Imported</p>
                  </div>
                  <div className={cn(
                    "p-4 rounded-lg text-center",
                    theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-50'
                  )}>
                    <SkipForward className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
                    <p className="text-2xl font-bold text-yellow-500">{importResults.skipped.length}</p>
                    <p className={cn("text-sm", theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Skipped</p>
                  </div>
                  <div className={cn(
                    "p-4 rounded-lg text-center",
                    theme === 'dark' ? 'bg-red-500/20' : 'bg-red-50'
                  )}>
                    <XCircle className="h-6 w-6 mx-auto mb-1 text-red-500" />
                    <p className="text-2xl font-bold text-red-500">{importResults.failed.length}</p>
                    <p className={cn("text-sm", theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>Failed</p>
                  </div>
                </div>

                {importResults.imported.length > 0 && (
                  <div>
                    <h4 className={cn(
                      "text-sm font-medium mb-2",
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    )}>Imported Apps:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {importResults.imported.map((item) => (
                        <div key={item.video_id} className={cn(
                          "text-sm flex items-center justify-between p-2 rounded",
                          theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
                        )}>
                          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{item.title}</span>
                          {item.mrr && (
                            <span className="text-emerald-500 font-medium">{formatMRR(item.mrr)}/mo</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {importResults.skipped.length > 0 && (
                  <div>
                    <h4 className={cn(
                      "text-sm font-medium mb-2",
                      theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                    )}>Skipped:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {importResults.skipped.map((item) => (
                        <div key={item.video_id} className={cn(
                          "text-sm p-2 rounded",
                          theme === 'dark' ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-500'
                        )}>
                          {item.title} - <span className="italic">{item.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className={cn(
          "chart-card p-6",
          theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
        )}>
          <h3 className={cn(
            "text-lg font-semibold mb-4",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>Add New SaaS App</h3>

          {/* Import from YouTube */}
          <div className={cn(
            "mb-4 p-4 rounded-lg border-2 border-dashed",
            theme === 'dark' ? 'border-white/20 bg-white/5' : 'border-gray-300 bg-gray-50'
          )}>
            <p className={cn(
              "text-sm mb-2 font-medium",
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            )}>Quick Import from YouTube Video</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="YouTube Video ID (e.g., dQw4w9WgXcQ)"
                value={newApp.youtubeId}
                onChange={(e) => setNewApp({ ...newApp, youtubeId: e.target.value })}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                  theme === 'dark'
                    ? 'bg-black/30 border border-white/10 text-white placeholder-gray-500'
                    : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400'
                )}
              />
              <button
                onClick={handleImportFromYoutube}
                disabled={importing || !newApp.youtubeId}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                  "bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                )}
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Import
              </button>
            </div>
            <p className={cn(
              "text-xs mt-2",
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            )}>Automatically fetches transcript and extracts business info using AI</p>
          </div>

          <div className={cn(
            "text-center py-2 mb-4",
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          )}>
            <span className="text-sm">or add manually</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="App Name *"
              value={newApp.name}
              onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
              className={cn(
                "px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                theme === 'dark'
                  ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500'
                  : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
              )}
            />
            <input
              type="text"
              placeholder="MRR (e.g., 10000)"
              value={newApp.mrr}
              onChange={(e) => setNewApp({ ...newApp, mrr: e.target.value })}
              className={cn(
                "px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                theme === 'dark'
                  ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500'
                  : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
              )}
            />
            <input
              type="text"
              placeholder="Description"
              value={newApp.description}
              onChange={(e) => setNewApp({ ...newApp, description: e.target.value })}
              className={cn(
                "px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                theme === 'dark'
                  ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500'
                  : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
              )}
            />
            <input
              type="text"
              placeholder="Category"
              value={newApp.category}
              onChange={(e) => setNewApp({ ...newApp, category: e.target.value })}
              className={cn(
                "px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                theme === 'dark'
                  ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500'
                  : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
              )}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddApp}
              disabled={!newApp.name}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all disabled:opacity-50"
            >
              Add App
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className={cn(
                "px-4 py-2 rounded-lg transition-all",
                theme === 'dark'
                  ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SaaS Table */}
      <div className={cn(
        "chart-card overflow-hidden",
        theme === 'dark' ? 'chart-card-dark' : 'chart-card-light'
      )}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-500" />
            <h2 className={cn(
              "text-lg font-semibold",
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>SaaS Apps with Public MRR</h2>
            <span className={cn(
              "text-sm px-2 py-0.5 rounded-full",
              theme === 'dark' ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'
            )}>
              {filteredApps.length}{filteredApps.length !== saasApps.length ? ` / ${saasApps.length}` : ''} records
            </span>
          </div>
          <div className="relative">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            )} />
            <input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className={cn(
                "pl-9 pr-4 py-2 rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500",
                theme === 'dark'
                  ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500'
                  : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setCurrentPage(1)
                }}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition-colors",
                  theme === 'dark'
                    ? 'text-gray-500 hover:text-gray-300 hover:bg-white/10'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : sortedApps.length === 0 ? (
          <div className={cn(
            "text-center py-12",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          )}>
            {searchQuery ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No apps found matching "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm mt-2 text-emerald-500 hover:text-emerald-400"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No SaaS apps tracked yet.</p>
                <p className="text-sm mt-2">Click "Import Channel" to import from a YouTube channel!</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={cn(
                  "border-y",
                  theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
                )}>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('name')}
                      className={cn(
                        "flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors",
                        theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                      )}
                    >
                      Name
                      <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSort('mrr')}
                      className={cn(
                        "flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ml-auto",
                        theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                      )}
                    >
                      Revenue
                      <SortIcon field="mrr" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">
                    <button
                      onClick={() => handleSort('category')}
                      className={cn(
                        "flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors",
                        theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                      )}
                    >
                      Category
                      <SortIcon field="category" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">
                    <button
                      onClick={() => handleSort('niche')}
                      className={cn(
                        "flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors",
                        theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                      )}
                    >
                      Niche
                      <SortIcon field="niche" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">
                    <button
                      onClick={() => handleSort('founder_name')}
                      className={cn(
                        "flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors",
                        theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                      )}
                    >
                      Founder
                      <SortIcon field="founder_name" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left hidden xl:table-cell">
                    <button
                      onClick={() => handleSort('published_at')}
                      className={cn(
                        "flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors",
                        theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                      )}
                    >
                      Published
                      <SortIcon field="published_at" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <span className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    )}>
                      Actions
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {paginatedApps.map((app, index) => (
                  <tr
                    key={app.id}
                    className={cn(
                      "transition-colors",
                      theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                    )}
                  >
                    {/* Name Column */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <span className={cn(
                          "flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold",
                          startIndex + index === 0 ? 'bg-yellow-500 text-black' :
                          startIndex + index === 1 ? 'bg-gray-300 text-black' :
                          startIndex + index === 2 ? 'bg-orange-500 text-white' :
                          theme === 'dark' ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'
                        )}>
                          {startIndex + index + 1}
                        </span>
                        {/* Thumbnail */}
                        {app.youtube_video_id ? (
                          <button
                            onClick={() => setSelectedVideo(app)}
                            className="relative flex-shrink-0 w-16 h-10 rounded overflow-hidden group"
                          >
                            <img
                              src={getYoutubeThumbnail(app.youtube_video_id)}
                              alt={app.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-all flex items-center justify-center">
                              <Play className="h-4 w-4 text-white" fill="white" />
                            </div>
                          </button>
                        ) : (
                          <div className={cn(
                            "flex-shrink-0 w-16 h-10 rounded flex items-center justify-center",
                            theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
                          )}>
                            <Building2 className={cn(
                              "h-4 w-4",
                              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                            )} />
                          </div>
                        )}
                        {/* Name & Description */}
                        <div className="min-w-0">
                          <Link
                            to={`/saas/${app.slug}`}
                            className={cn(
                              "font-medium hover:text-emerald-500 transition-colors block truncate",
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            )}
                          >
                            {app.name}
                          </Link>
                          {app.description && (
                            <p className={cn(
                              "text-xs truncate max-w-xs",
                              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                            )}>
                              {app.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* MRR Column */}
                    <td className="px-4 py-4 text-right">
                      <span className={cn(
                        "font-bold text-lg",
                        app.mrr ? 'text-emerald-500' : theme === 'dark' ? 'text-gray-600' : 'text-gray-300'
                      )}>
                        {formatMRR(app.mrr)}
                      </span>
                      {app.mrr && (
                        <span className={cn(
                          "text-xs block",
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        )}>/month</span>
                      )}
                    </td>

                    {/* Category Column */}
                    <td className="px-4 py-4 hidden md:table-cell">
                      {app.category ? (
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          theme === 'dark'
                            ? 'bg-white/10 text-gray-300'
                            : 'bg-gray-100 text-gray-600'
                        )}>
                          {app.category}
                        </span>
                      ) : (
                        <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}>-</span>
                      )}
                    </td>

                    {/* Niche Column */}
                    <td className="px-4 py-4 hidden md:table-cell">
                      {app.niche ? (
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          theme === 'dark'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-purple-100 text-purple-600'
                        )}>
                          {app.niche}
                        </span>
                      ) : (
                        <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}>-</span>
                      )}
                    </td>

                    {/* Founder Column */}
                    <td className="px-4 py-4 hidden lg:table-cell">
                      {app.founder_name ? (
                        <div className="flex items-center gap-2">
                          <User className={cn(
                            "h-4 w-4",
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          )} />
                          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                            {app.founder_name}
                          </span>
                        </div>
                      ) : (
                        <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}>-</span>
                      )}
                    </td>

                    {/* Published Date Column */}
                    <td className="px-4 py-4 hidden xl:table-cell">
                      {(app.youtube_published_at || app.created_at) ? (
                        <div className="flex items-center gap-2">
                          <Calendar className={cn(
                            "h-4 w-4",
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          )} />
                          <span className={cn(
                            "text-sm",
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          )}>
                            {formatDate(app.youtube_published_at || app.created_at)}
                          </span>
                        </div>
                      ) : (
                        <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}>-</span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          to={`/saas/${app.slug}`}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            theme === 'dark'
                              ? 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                          )}
                          title="View Details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        {app.website_url && (
                          <a
                            href={app.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              theme === 'dark'
                                ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                            )}
                            title="Visit Website"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                        {app.youtube_video_id && (
                          <button
                            onClick={() => setSelectedVideo(app)}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              theme === 'dark'
                                ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            )}
                            title="Watch Video"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className={cn(
            "flex items-center justify-between px-6 py-4 border-t",
            theme === 'dark' ? 'border-white/10' : 'border-gray-200'
          )}>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm",
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              )}>
                Showing {startIndex + 1}-{Math.min(endIndex, sortedApps.length)} of {sortedApps.length}
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value))
                  setCurrentPage(1)
                }}
                className={cn(
                  "ml-2 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500",
                  theme === 'dark'
                    ? 'bg-white/5 border border-white/10 text-white'
                    : 'bg-gray-50 border border-gray-200 text-gray-900'
                )}
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className={cn(
                  "px-2 py-1 rounded text-sm font-medium transition-all disabled:opacity-30",
                  theme === 'dark'
                    ? 'text-gray-300 hover:bg-white/10 disabled:hover:bg-transparent'
                    : 'text-gray-600 hover:bg-gray-100 disabled:hover:bg-transparent'
                )}
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn(
                  "p-1 rounded transition-all disabled:opacity-30",
                  theme === 'dark'
                    ? 'text-gray-300 hover:bg-white/10 disabled:hover:bg-transparent'
                    : 'text-gray-600 hover:bg-gray-100 disabled:hover:bg-transparent'
                )}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded text-sm font-medium transition-all",
                        currentPage === pageNum
                          ? 'bg-emerald-500 text-white'
                          : theme === 'dark'
                            ? 'text-gray-300 hover:bg-white/10'
                            : 'text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={cn(
                  "p-1 rounded transition-all disabled:opacity-30",
                  theme === 'dark'
                    ? 'text-gray-300 hover:bg-white/10 disabled:hover:bg-transparent'
                    : 'text-gray-600 hover:bg-gray-100 disabled:hover:bg-transparent'
                )}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className={cn(
                  "px-2 py-1 rounded text-sm font-medium transition-all disabled:opacity-30",
                  theme === 'dark'
                    ? 'text-gray-300 hover:bg-white/10 disabled:hover:bg-transparent'
                    : 'text-gray-600 hover:bg-gray-100 disabled:hover:bg-transparent'
                )}
              >
                Last
              </button>
            </div>
          </div>
        )}

        {/* Source Attribution */}
        <div className={cn(
          "p-4 border-t",
          theme === 'dark' ? 'border-white/10' : 'border-gray-200'
        )}>
          <p className={cn(
            "text-xs flex items-center gap-2",
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          )}>
            <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            Data sourced from YouTube channels. MRR figures are self-reported by founders and may not reflect current revenue.
          </p>
        </div>
      </div>
    </div>
  )
}
