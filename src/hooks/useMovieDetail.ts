import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { subscribeToLists } from '../services/movieListService'
import { getMovie, addMovie, updateMovie, deleteMovie, checkDuplicate, setTmdbLookupResult } from '../services/movieService'
import { fetchRemoteConfig, isTmdbSearchEnabled } from '../services/remoteConfigService'
import { lookupMediaType } from '../services/tmdbService'
import { recordError } from '../services/logger'
import { Movie, MovieList, WatchStatus, MY_MOVIES_LIST_NAME } from '../types'
import { useOnlineStatus } from './useOnlineStatus'

interface LocationState {
  activeListId?: string
  lists?: { id: string; name: string }[]
  initialTmdbQuery?: string
}

export interface TmdbSelection {
  title: string
  year: string
  posterUrl: string
  trailerUrl: string
  description: string
  genre: string
  tmdbId: number
  tmdbMediaType: string
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
    tmdbId: null,
    tmdbMediaType: null,
    tmdbLookupAttempted: false,
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

/**
 * Owns the data layer for the movie detail screen: load/new-movie setup,
 * edit form state, save (with duplicate detection), delete, and TMDB import.
 */
export function useMovieDetail() {
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
  const [isRedetectingMediaType, setIsRedetectingMediaType] = useState(false)
  const [redetectMediaTypeError, setRedetectMediaTypeError] = useState<string | null>(null)

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
        if (!m) {
          setNotFound(true)
          return
        }
        setMovie(m)
        setEditMovie({ ...m })
      })
      .catch((err) => {
        recordError(err, 'getMovie')
        setNotFound(true)
      })
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

  const handleTmdbSelect = useCallback((data: TmdbSelection) => {
    setEditMovie((prev) => (prev ? { ...prev, ...data, tmdbLookupAttempted: true } : prev))
    setShowTmdb(false)
  }, [])

  const redetectMediaType = useCallback(async () => {
    if (!user || !movie || movie.tmdbId == null || isRedetectingMediaType) return
    setIsRedetectingMediaType(true)
    setRedetectMediaTypeError(null)
    try {
      const resolved = await lookupMediaType(movie.tmdbId, movie.title)
      if (resolved == null) {
        setRedetectMediaTypeError("TMDB couldn't find this id as a movie or TV show.")
        return
      }
      await setTmdbLookupResult(user.uid, movie.id, movie.tmdbId, resolved)
      setMovie((prev) => (prev ? { ...prev, tmdbMediaType: resolved } : prev))
      setEditMovie((prev) => (prev ? { ...prev, tmdbMediaType: resolved } : prev))
    } catch (err) {
      recordError(err, 'redetectMediaType')
      setRedetectMediaTypeError("Couldn't reach TMDB. Try again.")
    } finally {
      setIsRedetectingMediaType(false)
    }
  }, [user, movie, isRedetectingMediaType])

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
    if (!isOnline) {
      setError('No internet connection. Please check your network and try again.')
      return
    }
    if (!editMovie.title.trim()) {
      setError('Title is required.')
      return
    }
    if (editMovie.title.trim().length > 200) {
      setError('Title must be 200 characters or fewer.')
      return
    }
    const toSave = buildSavePayload()
    if (!toSave) return

    setSaving(true)
    setError(null)
    try {
      const isDuplicate = await checkDuplicate(
        user.uid,
        toSave.title,
        toSave.year,
        toSave.genre || '',
        isNew ? undefined : toSave.id,
      )
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
    if (!isOnline) {
      setShowDuplicateWarning(false)
      setError('No internet connection. Please check your network and try again.')
      return
    }
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
    if (!isOnline) {
      setError('No internet connection. Please check your network and try again.')
      setShowDeleteConfirm(false)
      return
    }
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

  function dismissDuplicateWarning() {
    setShowDuplicateWarning(false)
    setPendingSave(null)
  }

  const yearError = editMovie ? getYearError(editMovie.year) : null
  const displayMovie = isEditing ? editMovie : movie

  return {
    isNew,
    initialTmdbQuery,
    loading,
    notFound,
    movie,
    editMovie,
    setEditMovie,
    displayMovie,
    isEditing,
    startEditing: () => setIsEditing(true),
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
    goHome: () => navigate('/'),
    redetectMediaType,
    isRedetectingMediaType,
    redetectMediaTypeError,
  }
}
