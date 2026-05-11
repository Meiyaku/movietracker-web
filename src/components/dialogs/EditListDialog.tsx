import { useState, useRef } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { recordError } from '../../services/logger'
import { MovieList, MAX_LIST_SUBTITLE_LENGTH } from '../../types'

interface EditListDialogProps {
  list: MovieList
  onConfirm: (name: string, subtitle: string | undefined, description: string | undefined) => Promise<void>
  onClose: () => void
}

export function EditListDialog({ list, onConfirm, onClose }: EditListDialogProps) {
  const [name, setName] = useState(list.name)
  const [subtitle, setSubtitle] = useState(list.subtitle ?? '')
  const [description, setDescription] = useState(list.description ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)

  async function handleSubmit() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('List name cannot be empty.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onConfirm(
        trimmedName,
        subtitle.trim() || undefined,
        description.trim() || undefined,
      )
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update list. Please try again.')
      recordError(e, 'editList')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-list-title"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6"
      >
        <h2 id="edit-list-title" className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Edit List
        </h2>

        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
          placeholder="List name"
          maxLength={100}
          disabled={loading || list.name === 'All Movies'}
          autoFocus
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3 disabled:opacity-50"
        />

        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subtitle</label>
        <input
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
          placeholder="Optional"
          maxLength={MAX_LIST_SUBTITLE_LENGTH}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3"
        />

        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
          rows={3}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-2 resize-none"
        />

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
