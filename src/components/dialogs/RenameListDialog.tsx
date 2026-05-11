import { useState, useRef, KeyboardEvent } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { recordError } from '../../services/logger'

interface RenameListDialogProps {
  currentName: string
  onConfirm: (newName: string) => Promise<void>
  onClose: () => void
}

export function RenameListDialog({ currentName, onConfirm, onClose }: RenameListDialogProps) {
  const [name, setName] = useState(currentName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('List name cannot be empty.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onConfirm(trimmed)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rename list. Please try again.')
      recordError(e, 'renameList')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-list-title"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6"
      >
        <h2 id="rename-list-title" className="text-lg font-bold text-gray-900 dark:text-white mb-4">Rename List</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="List name"
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-2"
          autoFocus
          disabled={loading}
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
