import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { subscribeToLists } from '../services/movieListService'
import { getMovie, addMovie, updateMovie, deleteMovie, checkDuplicate } from '../services/movieService'
import { fetchRemoteConfig, isTmdbSearchEnabled } from '../services/remoteConfigService'
import { recordError } from '../services/logger'
import { Movie, MovieList, WatchStatus, MY_MOVIES_LIST_NAME } from '../types'
import { TmdbSearchDialog } from '../components/TmdbSearchDialog'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { MovieDetailView } from '../components/MovieDetailView'
import { MovieDetailEditContent } from '../components/MovieDetailEditContent'

interface LocationState {
  activeListId?: string
  lists?: { id: string; name: string }[]
  initialTmdbQuery?: string
}

function emptyMovie(defaultListIds: string[]): Movie {
  return {
    id: '',
    title: '',
    year: '',
    genre: '',
    status: WatchStatus.WANT_TO_WATCH,
    rating: null,
    description: '',
    notes: '',
    trailerUrl: '',
    posterUrl: '',
    listIds: defaultListIds,
    createdAt: Timestamp.now(),
  }
}

function getYearError(year: string): string | null {
  if (!year) return null
  if (!/^\d{4}$/.test(year)) return 'Enter a 4-digit year (e.g. 2024)'
  const n = Number(year)
  const maxYear = new Date().getFullYear() + 5
  if (n < 1888 || n > maxYear) return `Year must be between 1888 and ${maxYear}`
  return null
}

export function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const isNew = id === 'new'
  const state = location.state as LocationState | null
  const initialTmdbQuery = isNew ? (state?.initialTmdbQuery ?? '') : ''

  const [movie, setMovie] = useState<Movie | null>(null)
  const [editMovie, setEditMovie] = useState<Movie | null>(null)
  const [isEditing, setIsEditing] = useState(isNew)
  const [lists, setLists] = useState<MovieList[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isOnline = useOnlineStatus()
  const [showTmdb, setShowTmdb] = useState(!!initialTmdbQuery)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [pendingSave, setPendingSave] = useState<Movie | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [tmdbEnabled, setTmdbEnabled] = useState(true)

  const deleteConfirmRef = useRef<HTMLDivElement>(null)
  const duplicateWarningRef = useRef<HTMLDivElement>(null)
  useFocusTrap(deleteConfirmRef, showDeleteConfirm)
  useFocusTrap(duplicateWarningRef, showDuplicateWarning)

  useEffect(() => {
    fetchRemoteConfig().then(() => setTmdbEnabled(isTmdbSearchEnabled()))
  }, [])

  useEffect(() => {
    if (!user) return
    const unsub = subscribeToLists(user.uid, setLists)
    return unsub
  }, [user])

  useEffect(() => {
    if (isNew || !user || !id) {
      setLoading(false)
      return
    }
    setLoading(true)
    getMovie(user.uid, id)
      .then((m) => {
        if (!m) { setNotFound(true); return }
        setMovie(m)
        setEditMovie({ ...m })
      })
      .catch((err) => { recordError(err, 'getMovie'); setNotFound(true) })
      .finally(() => setLoading(false))
  }, [isNew, user, id])

  useEffect(() => {
    if (!isNew || lists.length === 0) return
    const myMoviesList = lists.find((l) => l.name === MY_MOVIES_LIST_NAME)
    const defaultIds: string[] = []
    if (myMoviesList) defaultIds.push(myMoviesList.id)
    if (state?.activeListId && !defaultIds.includes(state.activeListId)) {
      defaultIds.push(state.activeListId)
    }
    setEditMovie(emptyMovie(defaultIds))
  }, [isNew, lists, state?.activeListId])

  const handleTmdbSelect = useCallback(
    (data: { title: string; year: string; posterUrl: string; trailerUrl: string; description: string; genre: string }) => {
      setEditMovie((prev) => (prev ? { ...prev, ...data } : prev))
      setShowTmdb(false)
    },
    [],
  )

  function buildSavePayload(): Movie | null {
    if (!editMovie) return null
    const myMoviesList = lists.find((l) => l.name === MY_MOVIES_LIST_NAME)
    const listIds =
      myMoviesList && !editMovie.listIds.includes(myMoviesList.id)
        ? [myMoviesList.id, ...editMovie.listIds]
        : editMovie.listIds
    return {
      ...editMovie,
      title: editMovie.title.trim(),
      listIds,
      rating: editMovie.status === WatchStatus.WATCHED ? editMovie.rating : null,
    }
  }

  async function persistSave(toSave: Movie) {
    if (isNew) {
      const newId = await addMovie(user!.uid, toSave)
      navigate(`/movies/${newId}`, { replace: true })
    } else {
      await updateMovie(user!.uid, toSave)
      setMovie({ ...toSave })
      setIsEditing(false)
    }
  }

  async function handleSave() {
    if (!user || !editMovie) return
    if (!isOnline) { setError('No internet connection. Please check your network and try again.'); return }
    if (!editMovie.title.trim()) { setError('Title is required.'); return }
    if (editMovie.title.trim().length > 200) { setError('Title must be 200 characters or fewer.'); return }
    const toSave = buildSavePayload()
    if (!toSave) return

    setSaving(true)
    setError(null)
    try {
      const isDuplicate = await checkDuplicate(user.uid, toSave.title, toSave.year, toSave.genre || '', isNew ? undefined : toSave.id)
      if (isDuplicate) {
        setPendingSave(toSave)
        setShowDuplicateWarning(true)
        return
      }
      await persistSave(toSave)
    } catch (e) {
      recordError(e, 'saveMovie')
      setError('Failed to save movie. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAnyway() {
    if (!user || !pendingSave) return
    if (!isOnline) { setShowDuplicateWarning(false); setError('No internet connection. Please check your network and try again.'); return }
    setShowDuplicateWarning(false)
    setSaving(true)
    setError(null)
    try {
      await persistSave(pendingSave)
    } catch (e) {
      recordError(e, 'saveMovie')
      setError('Failed to save movie. Please try again.')
    } finally {
      setSaving(false)
      setPendingSave(null)
    }
  }

  async function handleDelete() {
    if (!user || !movie) return
    if (!isOnline) { setError('No internet connection. Please check your network and try again.'); setShowDeleteConfirm(false); return }
    setDeleting(true)
    try {
      await deleteMovie(user.uid, movie.id)
      navigate('/', { replace: true, state: { movieDeleted: movie.title } })
    } catch (e) {
      recordError(e, 'deleteMovie')
      setError('Failed to delete movie.')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  function handleCancel() {
    if (isNew) {
      navigate('/')
    } else {
      setEditMovie(movie ? { ...movie } : null)
      setIsEditing(false)
      setError(null)
    }
  }

  useEffect(() => {
    if (!showDeleteConfirm) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowDeleteConfirm(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showDeleteConfirm])

  const yearError = editMovie ? getYearError(editMovie.year) : null
  const displayMovie = isEditing ? editMovie : movie

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
        <button onClick={() => navigate('/')} className="text-blue-600 dark:text-blue-400 text-sm hover:underline">
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
          onClick={() => navigate('/')}
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
            onClick={() => setIsEditing(true)}
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

        {!isEditing && <MovieDetailView movie={displayMovie} lists={lists} />}

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
                onClick={() => { setShowDuplicateWarning(false); setPendingSave(null) }}
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
