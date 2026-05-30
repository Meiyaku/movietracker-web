import { useEffect, useRef } from 'react'
import { TmdbSearchDialog } from '../components/TmdbSearchDialog'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { MovieDetailView } from '../components/MovieDetailView'
import { MovieDetailEditContent } from '../components/MovieDetailEditContent'
import { useMovieDetail } from '../hooks/useMovieDetail'

export function MovieDetailPage() {
  const {
    isNew,
    initialTmdbQuery,
    loading,
    notFound,
    movie,
    editMovie,
    setEditMovie,
    displayMovie,
    isEditing,
    startEditing,
    lists,
    saving,
    deleting,
    error,
    tmdbEnabled,
    yearError,
    showTmdb,
    setShowTmdb,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showDuplicateWarning,
    dismissDuplicateWarning,
    handleTmdbSelect,
    handleSave,
    handleSaveAnyway,
    handleDelete,
    handleCancel,
    goHome,
    redetectMediaType,
    isRedetectingMediaType,
    redetectMediaTypeError,
  } = useMovieDetail()

  const deleteConfirmRef = useRef<HTMLDivElement>(null)
  const duplicateWarningRef = useRef<HTMLDivElement>(null)
  useFocusTrap(deleteConfirmRef, showDeleteConfirm)
  useFocusTrap(duplicateWarningRef, showDuplicateWarning)

  useEffect(() => {
    if (!showDeleteConfirm) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowDeleteConfirm(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showDeleteConfirm, setShowDeleteConfirm])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">Movie not found.</p>
        <button onClick={goHome} className="text-blue-600 dark:text-blue-400 text-sm hover:underline">
          Go back home
        </button>
      </div>
    )
  }

  if (!displayMovie) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <button
          onClick={goHome}
          className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 font-bold text-gray-900 dark:text-white text-base truncate">
          {isNew ? 'Add Movie' : isEditing ? 'Edit Movie' : displayMovie.title}
        </h1>
        {!isEditing && !isNew && (
          <button
            onClick={startEditing}
            className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors font-medium"
          >
            Edit
          </button>
        )}
      </header>

      <div className="max-w-2xl mx-auto p-4 pb-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {!isEditing && (
          <MovieDetailView
            movie={displayMovie}
            onRedetectMediaType={redetectMediaType}
            isRedetectingMediaType={isRedetectingMediaType}
            redetectMediaTypeError={redetectMediaTypeError}
          />
        )}

        {isEditing && editMovie && (
          <MovieDetailEditContent
            editMovie={editMovie}
            lists={lists}
            isNew={isNew}
            saving={saving}
            deleting={deleting}
            yearError={yearError}
            tmdbEnabled={tmdbEnabled}
            onChange={(m) => setEditMovie(m)}
            onSave={handleSave}
            onCancel={handleCancel}
            onShowTmdb={() => setShowTmdb(true)}
            onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
          />
        )}
      </div>

      {showTmdb && (
        <TmdbSearchDialog onSelect={handleTmdbSelect} onClose={() => setShowTmdb(false)} initialQuery={initialTmdbQuery} />
      )}

      {/* Duplicate warning */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div
            ref={duplicateWarningRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="duplicate-warning-title"
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6"
          >
            <h2 id="duplicate-warning-title" className="text-lg font-bold text-gray-900 dark:text-white mb-2">Duplicate Movie</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              A movie with this title, year, and genre already exists. Save anyway?
            </p>
            <div className="flex gap-2">
              <button
                onClick={dismissDuplicateWarning}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAnyway}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Save Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div
            ref={deleteConfirmRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-movie-title"
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6"
          >
            <h2 id="delete-movie-title" className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Movie</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete{' '}
              <strong className="text-gray-900 dark:text-white">"{movie?.title}"</strong>? This
              action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
