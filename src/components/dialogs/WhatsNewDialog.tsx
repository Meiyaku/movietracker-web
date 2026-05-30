import { useRef } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'

interface WhatsNewDialogProps {
  notes: string
  onClose: () => void
}

export function WhatsNewDialog({ notes, onClose }: WhatsNewDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)

  const displayText = notes.trim() || 'No release notes available.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <h2 id="whats-new-title" className="text-lg font-bold text-gray-900 dark:text-white mb-3">
          What&apos;s New
        </h2>
        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto mb-4">
          {displayText}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
