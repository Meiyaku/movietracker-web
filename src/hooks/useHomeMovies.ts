import { useState, useEffect, useMemo, useCallback } from 'react'
import type { DocumentSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { subscribeToLists, sortLists } from '../services/movieListService'
import { getMoviesPage, setTmdbLookupResult, StaleCursorError } from '../services/movieService'
import { loadCachedMovies, cacheMovies } from '../services/movieCacheService'
import { pageSize } from '../services/remoteConfigService'
import { recordError } from '../services/logger'
import { autoMatchTmdbId } from '../services/tmdbBackfillService'
import { lookupMediaType } from '../services/tmdbService'
import { Movie, MovieList, SortOrder, WatchFilter, WatchStatus, MY_MOVIES_LIST_NAME } from '../types'

export const ACTIVE_LIST_KEY = 'movietracker_active_list'

function sortMovies(movies: Movie[], sortOrder: SortOrder): Movie[] {
  return [...movies].sort((a, b) => {
    switch (sortOrder) {
      case SortOrder.TITLE_ASC:
        return a.title.localeCompare(b.title)
      case SortOrder.TITLE_DESC:
        return b.title.localeCompare(a.title)
      case SortOrder.YEAR_ASC: {
        const ay = a.year === '' ? Infinity : Number(a.year)
        const by = b.year === '' ? Infinity : Number(b.year)
        return ay - by
      }
      case SortOrder.YEAR_DESC: {
        const ay = a.year === '' ? -Infinity : Number(a.year)
        const by = b.year === '' ? -Infinity : Number(b.year)
        return by - ay
      }
      case SortOrder.RATING_ASC: {
        const ar = a.rating == null ? Infinity : a.rating
        const br = b.rating == null ? Infinity : b.rating
        return ar - br
      }
      case SortOrder.RATING_DESC: {
        const ar = a.rating == null ? -Infinity : a.rating
        const br = b.rating == null ? -Infinity : b.rating
        return br - ar
      }
      case SortOrder.GENRE_ASC:
        return (a.genre || '').localeCompare(b.genre || '')
      case SortOrder.GENRE_DESC:
        return (b.genre || '').localeCompare(a.genre || '')
      case SortOrder.CREATED_ASC:
        return a.createdAt.seconds - b.createdAt.seconds
      case SortOrder.CREATED_DESC:
        return b.createdAt.seconds - a.createdAt.seconds
      default: {
        const exhaustiveCheck: never = sortOrder
        return exhaustiveCheck
      }
    }
  })
}

export interface HomeMovies {
  lists: MovieList[]
  activeList: MovieList | undefined
  activeListId: string | null
  movies: Movie[]
  filteredAndSorted: Movie[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  sortOrder: SortOrder
  setSortOrder: (o: SortOrder) => void
  watchFilter: WatchFilter
  setWatchFilter: (f: WatchFilter) => void
  listsLoading: boolean
  moviesLoading: boolean
  moviesError: string | null
  isLoadingMore: boolean
  serverHasMore: boolean
  watchedCount: number
  wantCount: number
  loadMovies: () => Promise<void>
  loadNextPage: () => Promise<void>
  needsTmdbMigration: boolean
  isMigratingTmdb: boolean
  migrateTmdbIds: () => Promise<void>
  migrationCandidate: Movie | null
  confirmMigrationMatch: (tmdbId: number, mediaType: string) => Promise<void>
  skipMigrationMatch: () => Promise<void>
}

/**
 * Owns all data-layer state for the home screen: the list subscription,
 * cursor-based movie pagination (including stale-cursor recovery), and
 * client-side filtering/sorting. The HomePage component renders the result.
 */
export function useHomeMovies(): HomeMovies {
  const { user } = useAuth()

  const [lists, setLists] = useState<MovieList[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_LIST_KEY),
  )
  const [movies, setMovies] = useState<Movie[]>([])
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null)
  const [serverHasMore, setServerHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.TITLE_ASC)
  const [watchFilter, setWatchFilter] = useState<WatchFilter>(WatchFilter.ALL)
  const [listsLoading, setListsLoading] = useState(true)
  const [moviesLoading, setMoviesLoading] = useState(false)
  const [moviesError, setMoviesError] = useState<string | null>(null)
  const [isMigratingTmdb, setIsMigratingTmdb] = useState(false)
  const [migrationQueue, setMigrationQueue] = useState<Movie[]>([])

  // Subscribe to lists; keep the active list valid as lists change.
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToLists(
      user.uid,
      (incoming) => {
        const sorted = sortLists(incoming)
        setLists(sorted)
        setListsLoading(false)
        setActiveListId((current) => {
          const exists = sorted.some((l) => l.id === current)
          if (current && exists) return current
          const myMovies = sorted.find((l) => l.name === MY_MOVIES_LIST_NAME)
          const next = myMovies?.id ?? sorted[0]?.id ?? null
          if (next) localStorage.setItem(ACTIVE_LIST_KEY, next)
          return next
        })
      },
      (err) => {
        recordError(err, 'subscribeToLists')
        setListsLoading(false)
      },
    )
    return unsub
  }, [user])

  // Load (or reload) the first page of movies for the active list.
  const loadMovies = useCallback(async () => {
    if (!user || !activeListId) {
      setMovies([])
      setCursor(null)
      setServerHasMore(false)
      return
    }
    const cached = loadCachedMovies(user.uid, activeListId)
    if (cached) {
      setMovies(cached)
      setMoviesLoading(false)
    } else {
      setMoviesLoading(true)
    }
    setMoviesError(null)
    try {
      const result = await getMoviesPage(user.uid, activeListId, pageSize())
      setMovies(result.movies)
      setCursor(result.lastDoc)
      setServerHasMore(result.hasMore)
      setMoviesLoading(false)
      cacheMovies(result.movies, user.uid, activeListId)
    } catch (err) {
      recordError(err, 'loadMovies')
      setMoviesError('Failed to load movies.')
      setMoviesLoading(false)
    }
  }, [user, activeListId])

  useEffect(() => {
    loadMovies()
  }, [loadMovies])

  // Reload when the user switches back to this tab, mirroring native app-foreground refresh.
  useEffect(() => {
    function handleFocus() {
      loadMovies()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadMovies])

  const loadNextPage = useCallback(async () => {
    if (!user || !activeListId || !serverHasMore || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const result = await getMoviesPage(user.uid, activeListId, pageSize(), cursor ?? undefined)
      setMovies((prev) => [...prev, ...result.movies])
      setCursor(result.lastDoc)
      setServerHasMore(result.hasMore)
    } catch (err) {
      if (err instanceof StaleCursorError) {
        setCursor(null)
        await loadMovies()
      } else {
        recordError(err, 'loadNextPage')
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [user, activeListId, serverHasMore, isLoadingMore, cursor, loadMovies])

  const filteredAndSorted = useMemo(() => {
    const byStatus =
      watchFilter === WatchFilter.WATCHED
        ? movies.filter((m) => m.status === WatchStatus.WATCHED)
        : watchFilter === WatchFilter.WANT_TO_WATCH
          ? movies.filter((m) => m.status === WatchStatus.WANT_TO_WATCH)
          : movies
    const q = searchQuery.toLowerCase().trim()
    const filtered = q ? byStatus.filter((m) => m.title.toLowerCase().includes(q)) : byStatus
    return sortMovies(filtered, sortOrder)
  }, [movies, searchQuery, sortOrder, watchFilter])

  const activeList = lists.find((l) => l.id === activeListId)
  const watchedCount = movies.filter((m) => m.status === WatchStatus.WATCHED).length
  const wantCount = movies.filter((m) => m.status === WatchStatus.WANT_TO_WATCH).length
  const needsTmdbMigration = movies.some(
    (m) =>
      (m.tmdbId == null && !m.tmdbLookupAttempted) ||
      (m.tmdbId != null && m.tmdbMediaType == null),
  )

  const migrateTmdbIds = useCallback(async () => {
    if (!user || isMigratingTmdb) return
    const needLookup = movies.filter((m) => m.tmdbId == null && !m.tmdbLookupAttempted)
    const needMediaType = movies.filter((m) => m.tmdbId != null && m.tmdbMediaType == null)
    if (needLookup.length === 0 && needMediaType.length === 0) return
    setIsMigratingTmdb(true)
    try {
      // Movies with tmdbId but no mediaType: probe TMDB to determine the correct type.
      // Skip entries the probe can't resolve so we retry on next migration.
      for (const movie of needMediaType) {
        if (movie.tmdbId == null) continue
        let resolved: string | null
        try {
          resolved = await lookupMediaType(movie.tmdbId, movie.title)
        } catch (err) {
          recordError(err, 'migrate:lookup-mediaType')
          continue
        }
        if (resolved == null) continue
        try {
          await setTmdbLookupResult(user.uid, movie.id, movie.tmdbId, resolved)
        } catch (err) {
          recordError(err, 'migrate:persist-mediaType')
        }
      }
      const unmatched: Movie[] = []
      for (const movie of needLookup) {
        const result = await autoMatchTmdbId(movie)
        if (result.kind === 'matched') {
          try {
            await setTmdbLookupResult(user.uid, movie.id, result.tmdbId, result.mediaType)
          } catch (err) {
            recordError(err, 'migrate:persist-match')
          }
        } else if (result.kind === 'unmatched') {
          unmatched.push(movie)
        }
        // 'error' → leave for next migration
      }
      setMigrationQueue(unmatched)
      if (unmatched.length === 0) await loadMovies()
    } finally {
      setIsMigratingTmdb(false)
    }
  }, [user, isMigratingTmdb, movies, loadMovies])

  const advanceMigrationQueue = useCallback(async () => {
    setMigrationQueue((prev) => prev.slice(1))
  }, [])

  const confirmMigrationMatch = useCallback(async (tmdbId: number, mediaType: string) => {
    if (!user) return
    const movie = migrationQueue[0]
    if (!movie) return
    try {
      await setTmdbLookupResult(user.uid, movie.id, tmdbId, mediaType)
    } catch (err) {
      recordError(err, 'migrate:confirm')
    }
    await advanceMigrationQueue()
    if (migrationQueue.length === 1) await loadMovies()
  }, [user, migrationQueue, advanceMigrationQueue, loadMovies])

  const skipMigrationMatch = useCallback(async () => {
    if (!user) return
    const movie = migrationQueue[0]
    if (!movie) return
    try {
      await setTmdbLookupResult(user.uid, movie.id, null, null)
    } catch (err) {
      recordError(err, 'migrate:skip')
    }
    await advanceMigrationQueue()
    if (migrationQueue.length === 1) await loadMovies()
  }, [user, migrationQueue, advanceMigrationQueue, loadMovies])

  return {
    lists,
    activeList,
    activeListId,
    movies,
    filteredAndSorted,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    watchFilter,
    setWatchFilter,
    listsLoading,
    moviesLoading,
    moviesError,
    isLoadingMore,
    serverHasMore,
    watchedCount,
    wantCount,
    loadMovies,
    loadNextPage,
    needsTmdbMigration,
    isMigratingTmdb,
    migrateTmdbIds,
    migrationCandidate: migrationQueue[0] ?? null,
    confirmMigrationMatch,
    skipMigrationMatch,
  }
}
