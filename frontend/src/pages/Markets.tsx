import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, Loader2, Search, Layers, Plus, Sparkles, Trash2, X, AlertTriangle, TrendingUp } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

const API_BASE = 'http://localhost:8892'

// Types
interface MarketNode {
  id: string
  parent_id: string | null
  name: string
  slug: string
  level: number
  description?: string
  children?: MarketNode[]
}

interface GeneratedNiche {
  name: string
  description: string
}

interface GeneratedMarket {
  name: string
  description: string
  example_niches: string[]
}

interface TreeNodeProps {
  node: MarketNode
  depth?: number
  expandedNodes: Set<string>
  toggleNode: (id: string) => void
  selectedNode: string | null
  setSelectedNode: (id: string | null) => void
  onAddChild: (parentId: string, parentName: string) => void
  onDelete: (id: string, name: string) => void
  onGenerateNiches: (parentId: string, parentName: string) => void
}

// Tree Node Component
function TreeNode({
  node,
  depth = 0,
  expandedNodes,
  toggleNode,
  selectedNode,
  setSelectedNode,
  onAddChild,
  onDelete,
  onGenerateNiches
}: TreeNodeProps) {
  const { theme } = useTheme()
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedNodes.has(node.id)
  const isSelected = selectedNode === node.id
  const [showActions, setShowActions] = useState(false)

  return (
    <div className="select-none">
      <div
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onClick={() => {
          if (hasChildren) toggleNode(node.id)
          setSelectedNode(node.id)
        }}
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-all group",
          theme === 'dark'
            ? cn("hover:bg-gray-800/50", isSelected && "bg-gray-800")
            : cn("hover:bg-gray-100", isSelected && "bg-gray-200")
        )}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren ? (
          <span className="text-gray-500">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}

        {/* Node Name */}
        <span className={cn(
          "flex-1",
          theme === 'dark' ? "text-gray-300" : "text-gray-700",
          depth === 0 && "font-semibold",
          depth > 2 && "text-sm"
        )}>
          {node.name}
        </span>

        {/* Action buttons on hover */}
        {showActions && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onAddChild(node.id, node.name)}
              className={cn(
                "p-1 rounded transition-colors",
                theme === 'dark' ? "hover:bg-gray-700 text-gray-400 hover:text-white" : "hover:bg-gray-200 text-gray-500 hover:text-gray-900"
              )}
              title="Add sub-niche"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onGenerateNiches(node.id, node.name)}
              className={cn(
                "p-1 rounded transition-colors",
                theme === 'dark' ? "hover:bg-gray-700 text-gray-400 hover:text-emerald-400" : "hover:bg-gray-200 text-gray-500 hover:text-emerald-600"
              )}
              title="AI Generate sub-niches"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(node.id, node.name)}
              className={cn(
                "p-1 rounded transition-colors",
                theme === 'dark' ? "hover:bg-gray-700 text-gray-400 hover:text-red-400" : "hover:bg-gray-200 text-gray-500 hover:text-red-600"
              )}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Child count badge */}
        {hasChildren && !showActions && (
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded",
            theme === 'dark' ? "bg-gray-800 text-gray-500" : "bg-gray-200 text-gray-500"
          )}>
            {node.children?.length}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className={cn(
          "border-l ml-4",
          theme === 'dark' ? "border-gray-800" : "border-gray-200"
        )}>
          {node.children?.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onGenerateNiches={onGenerateNiches}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Delete Confirmation Modal
function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isDeleting
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName: string
  isDeleting: boolean
}) {
  const { theme } = useTheme()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn(
        "relative z-10 w-full max-w-md rounded-xl p-6 shadow-xl",
        theme === 'dark' ? "bg-gray-900" : "bg-white"
      )}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h3 className={cn(
            "text-lg font-semibold",
            theme === 'dark' ? "text-white" : "text-gray-900"
          )}>Delete Market</h3>
        </div>

        <p className={cn(
          "mb-6",
          theme === 'dark' ? "text-gray-400" : "text-gray-600"
        )}>
          Are you sure you want to delete <strong>"{itemName}"</strong>? This will also delete all sub-niches. This action cannot be undone.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors",
              theme === 'dark'
                ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// Add Market Modal
function AddMarketModal({
  isOpen,
  onClose,
  onSubmit,
  parentName,
  isSubmitting
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string) => void
  parentName: string | null
  isSubmitting: boolean
}) {
  const { theme } = useTheme()
  const [name, setName] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim())
      setName('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn(
        "relative z-10 w-full max-w-md rounded-xl p-6 shadow-xl",
        theme === 'dark' ? "bg-gray-900" : "bg-white"
      )}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn(
            "text-lg font-semibold",
            theme === 'dark' ? "text-white" : "text-gray-900"
          )}>
            {parentName ? `Add sub-niche to "${parentName}"` : 'Add New Market'}
          </h3>
          <button onClick={onClose} className={cn(
            "p-1 rounded transition-colors",
            theme === 'dark' ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"
          )}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter market/niche name..."
            autoFocus
            className={cn(
              "w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4",
              theme === 'dark'
                ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
            )}
          />

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={cn(
                "px-4 py-2 rounded-lg transition-colors",
                theme === 'dark'
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// AI Generation Modal
function AIGenerateModal({
  isOpen,
  onClose,
  mode,
  parentName,
  parentId,
  existingMarkets,
  onAddNiches
}: {
  isOpen: boolean
  onClose: () => void
  mode: 'niches' | 'markets'
  parentName?: string
  parentId?: string
  existingMarkets: string[]
  onAddNiches: (niches: { name: string; parentId: string | null }[]) => void
}) {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [generatedNiches, setGeneratedNiches] = useState<GeneratedNiche[]>([])
  const [generatedMarkets, setGeneratedMarkets] = useState<GeneratedMarket[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  if (!isOpen) return null

  const generateNiches = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/api/ai/generate-niches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_name: parentName,
          parent_id: parentId,
          count: 5
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to generate niches')
      }

      const data = await response.json()
      setGeneratedNiches(data.niches)
      setSelectedItems(new Set(data.niches.map((_: GeneratedNiche, i: number) => i)))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateMarkets = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/api/ai/generate-markets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: 3,
          exclude: existingMarkets
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to generate markets')
      }

      const data = await response.json()
      setGeneratedMarkets(data.markets)
      setSelectedItems(new Set(data.markets.map((_: GeneratedMarket, i: number) => i)))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = (index: number) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedItems(newSelected)
  }

  const handleAddSelected = async () => {
    setAdding(true)
    const items = mode === 'niches' ? generatedNiches : generatedMarkets
    const selectedNiches = Array.from(selectedItems).map(i => ({
      name: items[i].name,
      parentId: mode === 'niches' ? (parentId || null) : null
    }))
    await onAddNiches(selectedNiches)
    setAdding(false)
    onClose()
  }

  const items = mode === 'niches' ? generatedNiches : generatedMarkets
  const hasItems = items.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn(
        "relative z-10 w-full max-w-lg rounded-xl p-6 shadow-xl max-h-[80vh] overflow-y-auto",
        theme === 'dark' ? "bg-gray-900" : "bg-white"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <h3 className={cn(
              "text-lg font-semibold",
              theme === 'dark' ? "text-white" : "text-gray-900"
            )}>
              {mode === 'niches' ? `Generate Sub-niches for "${parentName}"` : 'Generate New Markets'}
            </h3>
          </div>
          <button onClick={onClose} className={cn(
            "p-1 rounded transition-colors",
            theme === 'dark' ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"
          )}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        {!hasItems && !loading && (
          <div className="text-center py-8">
            <Sparkles className={cn(
              "h-12 w-12 mx-auto mb-4",
              theme === 'dark' ? "text-gray-600" : "text-gray-400"
            )} />
            <p className={cn(
              "mb-4",
              theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )}>
              {mode === 'niches'
                ? 'Click generate to get AI-powered sub-niche suggestions'
                : 'Click generate to get AI-powered market category suggestions'}
            </p>
            <button
              onClick={mode === 'niches' ? generateNiches : generateMarkets}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 mx-auto"
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500 mb-4" />
            <p className={cn(
              theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )}>Generating ideas...</p>
          </div>
        )}

        {hasItems && !loading && (
          <>
            <div className="space-y-3 mb-6">
              {items.map((item, index) => (
                <div
                  key={index}
                  onClick={() => toggleItem(index)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    selectedItems.has(index)
                      ? "border-emerald-500 bg-emerald-500/10"
                      : theme === 'dark'
                        ? "border-gray-700 hover:border-gray-600"
                        : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
                      selectedItems.has(index)
                        ? "border-emerald-500 bg-emerald-500"
                        : theme === 'dark' ? "border-gray-600" : "border-gray-300"
                    )}>
                      {selectedItems.has(index) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "font-medium",
                        theme === 'dark' ? "text-white" : "text-gray-900"
                      )}>{item.name}</p>
                      <p className={cn(
                        "text-sm mt-1",
                        theme === 'dark' ? "text-gray-400" : "text-gray-600"
                      )}>{item.description}</p>
                      {'example_niches' in item && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(item as GeneratedMarket).example_niches.map((niche, i) => (
                            <span key={i} className={cn(
                              "text-xs px-2 py-0.5 rounded",
                              theme === 'dark' ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600"
                            )}>
                              {niche}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-between items-center">
              <button
                onClick={mode === 'niches' ? generateNiches : generateMarkets}
                className={cn(
                  "px-4 py-2 rounded-lg transition-colors flex items-center gap-2",
                  theme === 'dark'
                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <Sparkles className="h-4 w-4" />
                Regenerate
              </button>
              <button
                onClick={handleAddSelected}
                disabled={selectedItems.size === 0 || adding}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Selected ({selectedItems.size})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function Markets() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [treeData, setTreeData] = useState<MarketNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' })
  const [addModal, setAddModal] = useState<{ open: boolean; parentId: string | null; parentName: string | null }>({ open: false, parentId: null, parentName: null })
  const [aiModal, setAiModal] = useState<{ open: boolean; mode: 'niches' | 'markets'; parentId?: string; parentName?: string }>({ open: false, mode: 'niches' })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  // Load data from API
  const loadMarkets = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/markets/tree`)
      if (!response.ok) throw new Error('Failed to load markets')
      const data = await response.json()

      if (data.markets && data.markets.length > 0) {
        setTreeData(data.markets)
        // Expand top-level nodes by default
        setExpandedNodes(new Set(data.markets.map((m: MarketNode) => m.id)))
      } else {
        // If no data, try to seed
        await fetch(`${API_BASE}/api/markets/seed`, { method: 'POST' })
        // Reload after seeding
        const retryResponse = await fetch(`${API_BASE}/api/markets/tree`)
        const retryData = await retryResponse.json()
        setTreeData(retryData.markets || [])
        setExpandedNodes(new Set((retryData.markets || []).map((m: MarketNode) => m.id)))
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMarkets()
  }, [loadMarkets])

  const toggleNode = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    const getAllIds = (nodes: MarketNode[]): string[] => {
      return nodes.flatMap(n => [n.id, ...(n.children ? getAllIds(n.children) : [])])
    }
    setExpandedNodes(new Set(getAllIds(treeData)))
  }, [treeData])

  const collapseAll = useCallback(() => {
    const topLevelIds = treeData.map(n => n.id)
    setExpandedNodes(new Set(topLevelIds))
  }, [treeData])

  // Count all nodes
  const countNodes = (nodes: MarketNode[]): number => {
    return nodes.reduce((acc, n) => acc + 1 + (n.children ? countNodes(n.children) : 0), 0)
  }

  // Filter nodes by search
  const filterNodes = (nodes: MarketNode[], query: string): MarketNode[] => {
    if (!query) return nodes

    return nodes.reduce<MarketNode[]>((acc, node) => {
      const matches = node.name.toLowerCase().includes(query.toLowerCase())
      const filteredChildren = node.children ? filterNodes(node.children, query) : undefined

      if (matches || (filteredChildren && filteredChildren.length > 0)) {
        acc.push({
          ...node,
          children: filteredChildren
        })
      }

      return acc
    }, [])
  }

  const filteredData = filterNodes(treeData, searchQuery)
  const totalNiches = countNodes(treeData)

  // Get selected node details
  const findNode = (nodes: MarketNode[], id: string): MarketNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children) {
        const found = findNode(node.children, id)
        if (found) return found
      }
    }
    return null
  }

  const selectedNodeData = selectedNode ? findNode(treeData, selectedNode) : null

  // Get top-level market names for AI exclusion
  const topLevelMarketNames = treeData.map(m => m.name)

  // Handlers
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await fetch(`${API_BASE}/api/markets/${deleteModal.id}`, { method: 'DELETE' })
      await loadMarkets()
      setDeleteModal({ open: false, id: '', name: '' })
      if (selectedNode === deleteModal.id) setSelectedNode(null)
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddMarket = async (name: string) => {
    setIsAdding(true)
    try {
      await fetch(`${API_BASE}/api/markets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          parent_id: addModal.parentId
        })
      })
      await loadMarkets()
      setAddModal({ open: false, parentId: null, parentName: null })
    } catch (err) {
      console.error('Add failed:', err)
    } finally {
      setIsAdding(false)
    }
  }

  const handleAddAINiches = async (niches: { name: string; parentId: string | null }[]) => {
    try {
      for (const niche of niches) {
        await fetch(`${API_BASE}/api/markets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: niche.name,
            parent_id: niche.parentId
          })
        })
      }
      await loadMarkets()
    } catch (err) {
      console.error('Add AI niches failed:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn(
            "text-3xl font-bold",
            theme === 'dark' ? "text-white" : "text-gray-900"
          )}>Markets</h1>
          <p className={cn(
            "mt-1",
            theme === 'dark' ? "text-gray-400" : "text-gray-600"
          )}>
            Explore {totalNiches} niches across {treeData.length} markets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddModal({ open: true, parentId: null, parentName: null })}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Market
          </button>
          <button
            onClick={() => setAiModal({ open: true, mode: 'markets' })}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors flex items-center gap-2",
              theme === 'dark'
                ? "bg-gray-800 text-emerald-400 hover:bg-gray-700"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            )}
          >
            <Sparkles className="h-4 w-4" />
            AI Generate
          </button>
          <button
            onClick={expandAll}
            className={cn(
              "px-3 py-2 text-sm rounded-lg transition-colors",
              theme === 'dark'
                ? "text-gray-400 hover:text-white hover:bg-gray-800"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
            )}
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className={cn(
              "px-3 py-2 text-sm rounded-lg transition-colors",
              theme === 'dark'
                ? "text-gray-400 hover:text-white hover:bg-gray-800"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
            )}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5",
          theme === 'dark' ? "text-gray-500" : "text-gray-400"
        )} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search niches..."
          className={cn(
            "w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all",
            theme === 'dark'
              ? "glass-input text-white placeholder-gray-500"
              : "glass-input-light text-gray-900 placeholder-gray-400"
          )}
        />
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: 'calc(100vh - 280px)' }}>
        {/* Tree View */}
        <div className={cn(
          "lg:col-span-2 rounded-xl p-4 overflow-y-auto",
          theme === 'dark' ? "glass-card" : "glass-card-light"
        )} style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12">
              <p className={cn(
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )}>
                {searchQuery ? `No niches found matching "${searchQuery}"` : 'No markets yet. Add one to get started!'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredData.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
                  selectedNode={selectedNode}
                  setSelectedNode={setSelectedNode}
                  onAddChild={(parentId, parentName) => setAddModal({ open: true, parentId, parentName })}
                  onDelete={(id, name) => setDeleteModal({ open: true, id, name })}
                  onGenerateNiches={(parentId, parentName) => setAiModal({ open: true, mode: 'niches', parentId, parentName })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div className={cn(
          "rounded-xl p-6 overflow-y-auto",
          theme === 'dark' ? "glass-card" : "glass-card-light"
        )} style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {selectedNodeData ? (
            <div>
              <h3 className={cn(
                "text-xl font-semibold mb-4",
                theme === 'dark' ? "text-white" : "text-gray-900"
              )}>
                {selectedNodeData.name}
              </h3>

              <div className="space-y-4">
                <div>
                  <p className={cn(
                    "text-sm",
                    theme === 'dark' ? "text-gray-400" : "text-gray-500"
                  )}>Level</p>
                  <p className={cn(
                    "font-medium",
                    theme === 'dark' ? "text-white" : "text-gray-900"
                  )}>
                    {selectedNodeData.level === 0 ? 'Core Market' :
                     selectedNodeData.level === 1 ? 'Category' :
                     selectedNodeData.level === 2 ? 'Sub-Category' :
                     selectedNodeData.level === 3 ? 'Niche' : 'Sub-Niche'}
                  </p>
                </div>

                {selectedNodeData.children && selectedNodeData.children.length > 0 && (
                  <div>
                    <p className={cn(
                      "text-sm",
                      theme === 'dark' ? "text-gray-400" : "text-gray-500"
                    )}>Sub-niches</p>
                    <p className={cn(
                      "font-medium",
                      theme === 'dark' ? "text-white" : "text-gray-900"
                    )}>{selectedNodeData.children.length}</p>
                  </div>
                )}

                <div className={cn(
                  "border-t pt-4",
                  theme === 'dark' ? "border-gray-800" : "border-gray-200"
                )}>
                  <p className={cn(
                    "text-sm mb-2",
                    theme === 'dark' ? "text-gray-400" : "text-gray-500"
                  )}>Actions</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => setAddModal({ open: true, parentId: selectedNodeData.id, parentName: selectedNodeData.name })}
                      className={cn(
                        "w-full px-4 py-2 rounded-lg border transition-colors text-sm flex items-center justify-center gap-2",
                        theme === 'dark'
                          ? "border-gray-700 text-gray-300 hover:text-white hover:border-gray-600"
                          : "border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300"
                      )}
                    >
                      <Plus className="h-4 w-4" />
                      Add Sub-niche
                    </button>
                    <button
                      onClick={() => setAiModal({ open: true, mode: 'niches', parentId: selectedNodeData.id, parentName: selectedNodeData.name })}
                      className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate Sub-niches
                    </button>
                    <button
                      onClick={() => navigate(`/trending?q=${encodeURIComponent(selectedNodeData.name)}`)}
                      className={cn(
                        "w-full px-4 py-2 rounded-lg border transition-colors text-sm flex items-center justify-center gap-2",
                        theme === 'dark'
                          ? "border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
                          : "border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300"
                      )}
                    >
                      <TrendingUp className="h-4 w-4" />
                      View Trends
                    </button>
                    <button
                      onClick={() => setDeleteModal({ open: true, id: selectedNodeData.id, name: selectedNodeData.name })}
                      className={cn(
                        "w-full px-4 py-2 rounded-lg border transition-colors text-sm",
                        theme === 'dark'
                          ? "border-red-900 text-red-400 hover:bg-red-900/20"
                          : "border-red-200 text-red-600 hover:bg-red-50"
                      )}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={cn(
              "text-center py-8",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a niche to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <DeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: '', name: '' })}
        onConfirm={handleDelete}
        itemName={deleteModal.name}
        isDeleting={isDeleting}
      />

      <AddMarketModal
        isOpen={addModal.open}
        onClose={() => setAddModal({ open: false, parentId: null, parentName: null })}
        onSubmit={handleAddMarket}
        parentName={addModal.parentName}
        isSubmitting={isAdding}
      />

      <AIGenerateModal
        isOpen={aiModal.open}
        onClose={() => setAiModal({ open: false, mode: 'niches' })}
        mode={aiModal.mode}
        parentName={aiModal.parentName}
        parentId={aiModal.parentId}
        existingMarkets={topLevelMarketNames}
        onAddNiches={handleAddAINiches}
      />
    </div>
  )
}
