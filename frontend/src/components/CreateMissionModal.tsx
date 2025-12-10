import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'

interface CreateMissionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const REGIONS = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
]

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001'

export function CreateMissionModal({ isOpen, onClose, onSuccess }: CreateMissionModalProps) {
  const { theme } = useTheme()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [keywords, setKeywords] = useState<string[]>([''])
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['US'])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddKeyword = () => {
    setKeywords([...keywords, ''])
  }

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index))
  }

  const handleKeywordChange = (index: number, value: string) => {
    const newKeywords = [...keywords]
    newKeywords[index] = value
    setKeywords(newKeywords)
  }

  const toggleRegion = (code: string) => {
    if (selectedRegions.includes(code)) {
      setSelectedRegions(selectedRegions.filter(r => r !== code))
    } else {
      setSelectedRegions([...selectedRegions, code])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!name.trim()) {
      setError('Mission name is required')
      return
    }

    const validKeywords = keywords.filter(k => k.trim())
    if (validKeywords.length === 0) {
      setError('At least one keyword is required')
      return
    }

    if (selectedRegions.length === 0) {
      setError('At least one region is required')
      return
    }

    setIsSubmitting(true)

    try {
      // Create the mission
      const { data: mission, error: missionError } = await supabase
        .from('missions')
        .insert({
          workspace_id: DEFAULT_WORKSPACE_ID,
          name: name.trim(),
          description: description.trim() || null,
          status: 'ACTIVE',
          config: {
            keywords: validKeywords,
            regions: selectedRegions,
            sources: ['GOOGLE_TRENDS'],
          },
        })
        .select()
        .single()

      if (missionError) throw missionError

      // Create keywords in the keywords table
      for (const keyword of validKeywords) {
        const { error: keywordError } = await supabase
          .from('keywords')
          .upsert({
            keyword: keyword.trim(),
          }, {
            onConflict: 'normalized_keyword',
          })

        if (keywordError) {
          console.error('Error creating keyword:', keywordError)
        }
      }

      onSuccess()
      onClose()
      resetForm()
    } catch (err: any) {
      console.error('Error creating mission:', err)
      // Show more detailed error message
      const errorMessage = err?.message || err?.error_description || err?.details || JSON.stringify(err) || 'Failed to create mission'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setKeywords([''])
    setSelectedRegions(['US'])
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4",
        theme === 'dark' ? 'glass-modal' : 'glass-modal-light'
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between p-6 border-b",
          theme === 'dark' ? 'border-white/10' : 'border-black/10'
        )}>
          <h2 className={cn(
            "text-xl font-semibold",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>Create New Mission</h2>
          <button
            onClick={onClose}
            className={cn(
              "p-1 rounded-lg transition-all duration-150",
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-white/10'
                : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          {/* Mission Name */}
          <div>
            <label className={cn(
              "block text-sm font-medium mb-2",
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            )}>
              Mission Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tech Trends Hunter"
              className={cn(
                "w-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500",
                theme === 'dark'
                  ? 'glass-input text-white placeholder-gray-500'
                  : 'glass-input-light text-gray-900 placeholder-gray-400'
              )}
            />
          </div>

          {/* Description */}
          <div>
            <label className={cn(
              "block text-sm font-medium mb-2",
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            )}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this mission track?"
              rows={2}
              className={cn(
                "w-full px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500",
                theme === 'dark'
                  ? 'glass-input text-white placeholder-gray-500'
                  : 'glass-input-light text-gray-900 placeholder-gray-400'
              )}
            />
          </div>

          {/* Keywords */}
          <div>
            <label className={cn(
              "block text-sm font-medium mb-2",
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            )}>
              Keywords to Track *
            </label>
            <div className="space-y-2">
              {keywords.map((keyword, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => handleKeywordChange(index, e.target.value)}
                    placeholder="Enter a keyword..."
                    className={cn(
                      "flex-1 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500",
                      theme === 'dark'
                        ? 'glass-input text-white placeholder-gray-500'
                        : 'glass-input-light text-gray-900 placeholder-gray-400'
                    )}
                  />
                  {keywords.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(index)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-150"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddKeyword}
              className="mt-2 flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-400 transition-all duration-150"
            >
              <Plus className="h-4 w-4" />
              Add another keyword
            </button>
          </div>

          {/* Regions */}
          <div>
            <label className={cn(
              "block text-sm font-medium mb-2",
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            )}>
              Regions to Monitor *
            </label>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((region) => (
                <button
                  key={region.code}
                  type="button"
                  onClick={() => toggleRegion(region.code)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                    selectedRegions.includes(region.code)
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                      : theme === 'dark'
                        ? 'glass-button text-gray-400'
                        : 'glass-button-light text-gray-600'
                  )}
                >
                  {region.code}
                </button>
              ))}
            </div>
            <p className={cn(
              "text-xs mt-2",
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            )}>
              Selected: {selectedRegions.length === 0 ? 'None' : selectedRegions.join(', ')}
            </p>
          </div>

          {/* Actions */}
          <div className={cn(
            "flex justify-end gap-3 pt-4 border-t",
            theme === 'dark' ? 'border-white/10' : 'border-black/10'
          )}>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "px-4 py-2 rounded-lg transition-all duration-150",
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-white/10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-black/5'
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'px-6 py-2 bg-emerald-500 text-white rounded-lg font-medium transition-all duration-150 shadow-lg shadow-emerald-500/25',
                isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-600'
              )}
            >
              {isSubmitting ? 'Creating...' : 'Create Mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
