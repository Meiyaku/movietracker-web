import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { subscribeToLists } from '../services/movieListService'
import { addMovie, updateMovie, deleteMovie } from '../services/movieService'
import { Movie, MovieList, WatchStatus, MY_MOVIES_LIST_NAME } from '../types'
import { WatchStatusBadge } from '../components/WatchStatusBadge'
import { StarRating } from '../components/StarRating'
import { StarRatingPicker } from '../components/StarRatingPicker'
import { TmdbSearchDialog } from '../components/TmdbSearchDialog'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'

interface LocationState {
  activeListId?: string
  lists?: { id: string; name: string }[]
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

export function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const isNew = id === 'new'
  const state = location.state as LocationState | null

  const [movie, setMovie] = useState<Movie | null>(null)
  const [editMovie, setEditMovie] = useState<Movie | null>(null)
  const [isEditing, setIsEditing] = useState(isNew)
  const [lists, setLists] = useState<MovieList[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTmdb, setShowTmdb] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Subscribe to lists for checkboxes
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToLists(user.uid, setLists)
    return unsub
  }, [user])

  // Load movie if editing existing
  useEffect(() => {
    if (isNew || !user || !id) {
      setLoading(false)
      return
    }
    setLoading(true)
    const ref = doc(db, 'users', user.uid, 'movies', id)
    getDoc(ref)
      .then((snap) => {
        if (!snap.exists()) {
          setNotFound(true)
          return
        }
        const data = snap.data()
        const statusStr: string = data.status ?? WatchStatus.WANT_TO_WATCH
        const status = Object.values(WatchStatus).includes(statusStr as WatchStatus)
          ? (statusStr as WatchStatus)
          : WatchStatus.WANT_TO_WATCH
        const m: Movie = {
          id: snap.id,
          title: data.title ?? '',
          year: data.year != null ? String(data.year) : '',
          genre: data.genre ?? '',
          status,
          rating: data.rating != null ? Number(data.rating) : null,
          description: data.description ?? '',
          notes: data.notes ?? '',
          trailerUrl: data.trailerUrl ?? '',
          posterUrl: data.posterUrl ?? '',
          listIds: Array.isArray(data.listIds)
            ? (data.listIds as unknown[]).filter((x): x is string => typeof x === 'string')
            : [],
          createdAt:
            data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
        }
        setMovie(m)
        setEditMovie({ ...m })
      })
      .catch((err) => {
        console.error(err)
        setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [isNew, user, id])

  // Build default movie for new
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
    (data: { title: string; year: string; posterUrl: string; trailerUrl: string; description: string }) => {
      setEditMovie((prev) => (prev ? { ...prev, ...data } : prev))
      setShowTmdb(false)
    },
    [],
  )

  function toggleListId(listId: string) {
    setEditMovie((prev) => {
      if (!prev) return prev
      const myMoviesList = lists.find((l) => l.name === MY_MOVIES_LIST_NAME)
      if (listId === myMoviesList?.id) return prev // cannot uncheck My Movies
      const has = prev.listIds.includes(listId)
      return {
        ...prev,
        listIds: has ? prev.listIds.filter((id) => id !== listId) : [...prev.listIds, listId],
      }
    })
  }

  async function handleSave() {
    if (!user || !editMovie) return
    if (!editMovie.title.trim()) {
      setError('Title is required.')
      return
    }
    const myMoviesList = lists.find((l) => l.name === MY_MOVIES_LIST_NAME)
    const listIds =
      myMoviesList && !editMovie.listIds.includes(myMoviesList.id)
        ? [myMoviesList.id, ...editMovie.listIds]
        : editMovie.listIds

    const toSave: Movie = {
      ...editMovie,
      title: editMovie.title.trim(),
      listIds,
      rating: editMovie.status === WatchStatus.WATCHED ? editMovie.rating : null,
    }

    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const newId = await addMovie(user.uid, toSave)
        navigate(`/movies/${newId}`, { replace: true })
      } else {
        await updateMovie(user.uid, toSave)
        setMovie({ ...toSave })
        setIsEditing(false)
      }
    } catch (e) {
      console.error(e)
      setError('Failed to save movie. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!user || !movie) return
    setDeleting(true)
    try {
      await deleteMovie(user.uid, movie.id)
      navigate('/', { replace: true })
    } catch (e) {
      console.error(e)
      setError('Failed to delete movie.')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  function handleCancel() {
    if (isNew) {
      navigate(-1)
    } else {
      setEditMovie(movie ? { ...movie } : null)
      setIsEditing(false)
      setError(null)
    }
  }

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
      {/* Header */}
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

        {/* ─── VIEW MODE ─── */}
        {!isEditing && (
          <div className="space-y-4">
            {/* Poster */}
            <div className="w-full max-w-[200px] mx-auto rounded-2xl overflow-hidden shadow-lg bg-gray-200 dark:bg-gray-700 aspect-[2/3]">
              {displayMovie.posterUrl ? (
                <img
                  src={displayMovie.posterUrl}
                  alt={displayMovie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{displayMovie.title}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <WatchStatusBadge status={displayMovie.status} />
                  {displayMovie.status === WatchStatus.WATCHED && displayMovie.rating != null && (
                    <StarRating rating={displayMovie.rating} />
                  )}
                </div>
              </div>

              {(displayMovie.year || displayMovie.genre) && (
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                  {displayMovie.year && (
                    <p>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Year:</span>{' '}
                      {displayMovie.year}
                    </p>
                  )}
                  {displayMovie.genre && (
                    <p>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Genre:</span>{' '}
                      {displayMovie.genre}
                    </p>
                  )}
                </div>
              )}

              {lists.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Lists
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {lists
                      .filter((l) => displayMovie.listIds.includes(l.id))
                      .map((l) => (
                        <span
                          key={l.id}
                          className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full"
                        >
                          {l.name}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {displayMovie.trailerUrl && (
                <a
                  href={displayMovie.trailerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors w-fit"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                  Watch Trailer
                </a>
              )}

              {displayMovie.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Description
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {displayMovie.description}
                  </p>
                </div>
              )}

              {displayMovie.notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {displayMovie.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── EDIT MODE ─── */}
        {isEditing && editMovie && (
          <div className="space-y-4">
            {/* TMDB search */}
            <button
              onClick={() => setShowTmdb(true)}
              className="w-full py-2.5 border-2 border-dashed border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
            >
              Search TMDB to auto-fill details
            </button>

            {/* Poster preview */}
            {editMovie.posterUrl && (
              <div className="w-24 h-36 rounded-xl overflow-hidden shadow mx-auto">
                <img src={editMovie.posterUrl} alt="Poster" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={editMovie.title}
                  onChange={(e) => setEditMovie({ ...editMovie, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Movie title"
                />
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={editMovie.year}
                  onChange={(e) => setEditMovie({ ...editMovie, year: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. 2024"
                  min="1888"
                  max="2099"
                />
              </div>

              {/* Genre */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Genre
                </label>
                <input
                  type="text"
                  value={editMovie.genre}
                  onChange={(e) => setEditMovie({ ...editMovie, genre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. Action, Comedy"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Status
                </label>
                <div className="flex rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600">
                  {[WatchStatus.WANT_TO_WATCH, WatchStatus.WATCHED].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setEditMovie({
                          ...editMovie,
                          status: s,
                          rating: s === WatchStatus.WANT_TO_WATCH ? null : editMovie.rating,
                        })
                      }}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        editMovie.status === s
                          ? s === WatchStatus.WATCHED
                            ? 'bg-watched-fill text-green-900 border-watched-border'
                            : 'bg-want-fill text-white border-want-border'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {s === WatchStatus.WATCHED ? 'Watched' : 'Want to Watch'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating (only when watched) */}
              {editMovie.status === WatchStatus.WATCHED && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Rating
                  </label>
                  <StarRatingPicker
                    value={editMovie.rating}
                    onChange={(r) => setEditMovie({ ...editMovie, rating: r })}
                  />
                  {editMovie.rating != null && (
                    <button
                      type="button"
                      onClick={() => setEditMovie({ ...editMovie, rating: null })}
                      className="mt-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      Clear rating
                    </button>
                  )}
                </div>
              )}

              {/* Trailer URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Trailer URL
                </label>
                <input
                  type="url"
                  value={editMovie.trailerUrl}
                  onChange={(e) => setEditMovie({ ...editMovie, trailerUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              {/* Description (from TMDB) */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={editMovie.description}
                  onChange={(e) => setEditMovie({ ...editMovie, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  placeholder="Auto-filled from TMDB search…"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Notes
                </label>
                <textarea
                  value={editMovie.notes}
                  onChange={(e) => setEditMovie({ ...editMovie, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  placeholder="Your thoughts on this movie…"
                />
              </div>

              {/* Lists */}
              {lists.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Lists
                  </label>
                  <div className="space-y-2">
                    {lists.map((list) => {
                      const isMyMovies = list.name === MY_MOVIES_LIST_NAME
                      const checked = editMovie.listIds.includes(list.id)
                      return (
                        <label
                          key={list.id}
                          className={`flex items-center gap-3 py-1 ${isMyMovies ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isMyMovies}
                            onChange={() => toggleListId(list.id)}
                            className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-800 dark:text-gray-200">
                            {list.name}
                            {isMyMovies && (
                              <span className="ml-1 text-xs text-gray-400">(always included)</span>
                            )}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editMovie.title.trim()}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>

              {!isNew && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="w-full py-3 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl text-sm font-semibold transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Delete Movie'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TMDB Search Dialog */}
      {showTmdb && (
        <TmdbSearchDialog onSelect={handleTmdbSelect} onClose={() => setShowTmdb(false)} />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Movie</h2>
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
