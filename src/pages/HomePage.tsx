import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { subscribeToLists, sortLists } from '../services/movieListService'
import { subscribeToMoviesForList } from '../services/movieService'
import { Movie, MovieList, SortOrder, WatchFilter, WatchStatus, MY_MOVIES_LIST_NAME } from '../types'
import { AppDrawer } from '../components/AppDrawer'
import { MovieCard } from '../components/MovieCard'

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
}

const watchFilterLabels: Record<WatchFilter, string> = {
  [WatchFilter.ALL]: 'All Movies',
  [WatchFilter.WATCHED]: 'Watched',
  [WatchFilter.WANT_TO_WATCH]: 'Want to Watch',
}

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [lists, setLists] = useState<MovieList[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_LIST_KEY),
  )
  const [movies, setMovies] = useState<Movie[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.TITLE_ASC)
  const [watchFilter, setWatchFilter] = useState<WatchFilter>(WatchFilter.ALL)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [listsLoading, setListsLoading] = useState(true)
  const [moviesLoading, setMoviesLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

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

        // If no active list or it no longer exists, pick "My Movies"
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
        console.error(err)
        setListsLoading(false)
      },
    )
    return unsub
  }, [user])

  // Subscribe to movies for active list
  useEffect(() => {
    if (!user || !activeListId) {
      setMovies([])
      return
    }
    setMoviesLoading(true)
    const unsub = subscribeToMoviesForList(
      user.uid,
      activeListId,
      (incoming) => {
        setMovies(incoming)
        setMoviesLoading(false)
      },
      (err) => {
        console.error(err)
        setMoviesLoading(false)
      },
    )
    return unsub
  }, [user, activeListId])

  function handleSelectList(id: string) {
    setActiveListId(id)
    localStorage.setItem(ACTIVE_LIST_KEY, id)
    setSearchQuery('')
    setWatchFilter(WatchFilter.ALL)
  }

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

  const activeListName = lists.find((l) => l.id === activeListId)?.name ?? 'Movies'

  // Status counts for the header
  const watchedCount = movies.filter((m) => m.status === WatchStatus.WATCHED).length
  const wantCount = movies.filter((m) => m.status === WatchStatus.WANT_TO_WATCH).length

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Sidebar – always visible on lg, drawer on mobile */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:flex-shrink-0">
        <AppDrawer
          lists={lists}
          activeListId={activeListId}
          onSelectList={handleSelectList}
          onClose={() => {}}
        />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <AppDrawer
          lists={lists}
          activeListId={activeListId}
          onSelectList={handleSelectList}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Hamburger (mobile) */}
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
              <h2 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                {activeListName}
              </h2>
              {!moviesLoading && movies.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {watchedCount} watched · {wantCount} want to watch
                </p>
              )}
            </div>
          </div>

          {/* Search + Sort row */}
          <div className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {/* Filter icon button */}
            <div ref={filterRef} className="relative">
              <button
                onClick={() => { setFilterOpen((o) => !o); setSortOpen(false) }}
                className={`p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors ${watchFilter !== WatchFilter.ALL ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
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

            {/* Sort icon button */}
            <div ref={sortRef} className="relative">
              <button
                onClick={() => { setSortOpen((o) => !o); setFilterOpen(false) }}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
        <main className="flex-1 overflow-y-auto p-4 pb-24">
          {listsLoading || moviesLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    Tap + to add your first movie
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-w-2xl mx-auto">
              {filteredAndSorted.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          )}
        </main>

        {/* FAB */}
        <button
          onClick={() =>
            navigate('/movies/new', {
              state: { activeListId, lists: lists.map((l) => ({ id: l.id, name: l.name })) },
            })
          }
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20"
          aria-label="Add movie"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
