import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import type { DocumentSnapshot } from 'firebase/firestore'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { subscribeToLists, sortLists } from '../services/movieListService'
import { getMoviesPage, subscribeToAllMovies, StaleCursorError } from '../services/movieService'
import { loadCachedMovies, cacheMovies } from '../services/movieCacheService'
import { pageSize } from '../services/remoteConfigService'
import { recordError } from '../services/logger'
import { Movie, MovieList, SortOrder, WatchFilter, WatchStatus, MY_MOVIES_LIST_NAME } from '../types'
import { AppDrawer } from '../components/AppDrawer'
import { MovieCard } from '../components/MovieCard'
import { SkeletonMovieCard } from '../components/SkeletonMovieCard'
import { Toast } from '../components/Toast'
import { usePullToRefresh } from '../hooks/usePullToRefresh'

const ACTIVE_LIST_KEY = 'movietracker_active_list'

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

const sortLabels: Record<SortOrder, string> = {
  [SortOrder.TITLE_ASC]: 'Title A–Z',
  [SortOrder.TITLE_DESC]: 'Title Z–A',
  [SortOrder.YEAR_ASC]: 'Year (Oldest)',
  [SortOrder.YEAR_DESC]: 'Year (Newest)',
  [SortOrder.RATING_ASC]: 'Rating (Low)',
  [SortOrder.RATING_DESC]: 'Rating (High)',
  [SortOrder.GENRE_ASC]: 'Genre A–Z',
  [SortOrder.GENRE_DESC]: 'Genre Z–A',
  [SortOrder.CREATED_ASC]: 'Date Added (Oldest)',
  [SortOrder.CREATED_DESC]: 'Date Added (Newest)',
}

const watchFilterLabels: Record<WatchFilter, string> = {
  [WatchFilter.ALL]: 'All Movies',
  [WatchFilter.WATCHED]: 'Watched',
  [WatchFilter.WANT_TO_WATCH]: 'Want to Watch',
}

export function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [listsLoading, setListsLoading] = useState(true)
  const [moviesLoading, setMoviesLoading] = useState(false)
  const [moviesError, setMoviesError] = useState<string | null>(null)
  const [allMovies, setAllMovies] = useState<Movie[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [deletedToast, setDeletedToast] = useState<string | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Show "Movie deleted" toast when navigated back from detail page
  useEffect(() => {
    const state = location.state as { movieDeleted?: string } | null
    if (state?.movieDeleted) {
      setDeletedToast(state.movieDeleted)
      navigate('/', { replace: true, state: {} })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Subscribe to lists
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
      (err) => { recordError(err, 'subscribeToLists'); setListsLoading(false) },
    )
    return unsub
  }, [user])

  // Subscribe to all movies for per-list counts
  useEffect(() => {
    if (!user) return
    return subscribeToAllMovies(user.uid, setAllMovies, (err) => recordError(err, 'subscribeToAllMovies'))
  }, [user])

  // Load first page of movies for the active list
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

  // Reload when the user switches back to this tab, mirroring native app-foreground refresh
  useEffect(() => {
    function handleFocus() { loadMovies() }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadMovies])

  // Load the next page of movies
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

  const handleRefresh = useCallback(async () => {
    await loadMovies()
  }, [loadMovies])

  const { pullDistance, refreshing } = usePullToRefresh(scrollRef, handleRefresh)

  function handleSelectList(id: string) {
    setActiveListId(id)
    localStorage.setItem(ACTIVE_LIST_KEY, id)
    setSearchQuery('')
    setWatchFilter(WatchFilter.ALL)
  }

  const listMovieCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allMovies.forEach((m) => {
      m.listIds.forEach((id) => { counts[id] = (counts[id] ?? 0) + 1 })
    })
    return counts
  }, [allMovies])

  const filteredAndSorted = useMemo(() => {
    const byStatus = watchFilter === WatchFilter.WATCHED
      ? movies.filter((m) => m.status === WatchStatus.WATCHED)
      : watchFilter === WatchFilter.WANT_TO_WATCH
        ? movies.filter((m) => m.status === WatchStatus.WANT_TO_WATCH)
        : movies
    const q = searchQuery.toLowerCase().trim()
    const filtered = q ? byStatus.filter((m) => m.title.toLowerCase().includes(q)) : byStatus
    return sortMovies(filtered, sortOrder)
  }, [movies, searchQuery, sortOrder, watchFilter])

  // Trigger next page load when sentinel becomes visible
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !serverHasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadNextPage() },
      { root: scrollRef.current, rootMargin: '0px 0px 200px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [serverHasMore, loadNextPage])

  const activeList = lists.find((l) => l.id === activeListId)
  const activeListName = activeList?.name ?? 'Movies'
  const activeListSubtitle = activeList?.subtitle
  const watchedCount = movies.filter((m) => m.status === WatchStatus.WATCHED).length
  const wantCount = movies.filter((m) => m.status === WatchStatus.WANT_TO_WATCH).length

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:flex-shrink-0">
        <AppDrawer lists={lists} activeListId={activeListId} onSelectList={handleSelectList} onClose={() => {}} movieCounts={listMovieCounts} />
      </div>

      {drawerOpen && (
        <AppDrawer lists={lists} activeListId={activeListId} onSelectList={handleSelectList} onClose={() => setDrawerOpen(false)} movieCounts={listMovieCounts} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 dark:text-white text-base leading-tight">{activeListName}</h2>
              {activeListSubtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{activeListSubtitle}</p>
              )}
              {!moviesLoading && movies.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{watchedCount} watched · {wantCount} want to watch</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies…"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div ref={filterRef} className="relative">
              <button
                onClick={() => { setFilterOpen((o) => !o); setSortOpen(false) }}
                className={`p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors ${watchFilter !== WatchFilter.ALL ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                aria-label="Filter by watch status"
                aria-expanded={filterOpen}
                title="Filter by watch status"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
              </button>
              {filterOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
                  {Object.values(WatchFilter).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => { setWatchFilter(filter); setFilterOpen(false) }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${watchFilter === filter ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-900 dark:text-white'}`}
                    >
                      {watchFilterLabels[filter]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div ref={sortRef} className="relative">
              <button
                onClick={() => { setSortOpen((o) => !o); setFilterOpen(false) }}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                aria-label="Sort movies"
                aria-expanded={sortOpen}
                title="Sort movies"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m9-4v12m0 0l-3-3m3 3l3-3" />
                </svg>
              </button>
              {sortOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
                  {Object.values(SortOrder).map((order) => (
                    <button
                      key={order}
                      onClick={() => { setSortOrder(order); setSortOpen(false) }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${sortOrder === order ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-900 dark:text-white'}`}
                    >
                      {sortLabels[order]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Movie list */}
        <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 pb-24">
          {/* Pull-to-refresh indicator */}
          {(pullDistance > 0 || refreshing) && (
            <div
              className="flex items-center justify-center overflow-hidden transition-all"
              style={{ height: refreshing ? 40 : pullDistance }}
            >
              <div className={`w-5 h-5 border-2 rounded-full ${refreshing || pullDistance >= 32 ? 'border-blue-600 border-t-transparent animate-spin' : 'border-gray-400 border-t-transparent'}`} />
            </div>
          )}

          {listsLoading || moviesLoading ? (
            <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonMovieCard key={i} />)}
            </div>
          ) : moviesError ? (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
              <p className="text-gray-500 dark:text-gray-400 text-sm">{moviesError}</p>
              <button
                onClick={() => loadMovies()}
                className="px-4 py-1.5 text-sm text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              {searchQuery ? (
                <>
                  <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No movies match "{searchQuery}"</p>
                </>
              ) : watchFilter !== WatchFilter.ALL ? (
                <>
                  <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No movies match the current filter</p>
                </>
              ) : (
                <>
                  <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No movies yet</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Tap + to add your first movie</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
              {filteredAndSorted.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
              {isLoadingMore && (
                <div className="col-span-2 flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <div ref={sentinelRef} className="col-span-2" aria-hidden="true" />
            </div>
          )}
        </main>

        {/* FAB */}
        <button
          onClick={() => navigate('/movies/new', { state: { activeListId, lists: lists.map((l) => ({ id: l.id, name: l.name })) } })}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20"
          aria-label="Add movie"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {deletedToast && (
        <Toast message={`"${deletedToast}" deleted`} onDismiss={() => setDeletedToast(null)} />
      )}
    </div>
  )
}
