import { useState, useRef } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { recordError } from '../../services/logger'

interface DeleteListDialogProps {
  listName: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function DeleteListDialog({ listName, onConfirm, onClose }: DeleteListDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete list. Please try again.')
      recordError(e, 'deleteList')
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
        aria-labelledby="delete-list-title"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6"
      >
        <h2 id="delete-list-title" className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete List</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Delete <strong className="text-gray-900 dark:text-white">"{listName}"</strong>? This will
          remove it from all movies but will not delete the movies themselves.
        </p>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
