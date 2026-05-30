import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { SortOrder, WatchFilter, MainScreen } from '../types'
import { useMainScreen } from '../context/MainScreenContext'
import { useHomeMovies } from '../hooks/useHomeMovies'
import { useAutoWhatsNew } from '../hooks/useAutoWhatsNew'
import { AppDrawer } from '../components/AppDrawer'
import { WhatsNewDialog } from '../components/dialogs/WhatsNewDialog'
import { TmdbMigrationPickerDialog } from '../components/TmdbMigrationPickerDialog'
import { MovieCard } from '../components/MovieCard'
import { SkeletonMovieCard } from '../components/SkeletonMovieCard'
import { Toast } from '../components/Toast'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { MenuIcon, SearchIcon, CloseIcon, SortIcon, PlusIcon } from '../components/icons'

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
  const { openMainScreen } = useMainScreen()

  const {
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
    migrationCandidate,
    confirmMigrationMatch,
    skipMigrationMatch,
  } = useHomeMovies()

  const { autoWhatsNew, dismissAutoWhatsNew } = useAutoWhatsNew()

  const [drawerOpen, setDrawerOpen] = useState(false)
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
  }, [location.state, navigate])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const { pullDistance, refreshing } = usePullToRefresh(scrollRef, loadMovies)

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

  const activeListName = activeList?.name ?? 'Movies'
  const activeListSubtitle = activeList?.subtitle

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:flex-shrink-0">
        <AppDrawer
          onClose={() => {}}
          showMigrateData={needsTmdbMigration}
          isMigratingData={isMigratingTmdb}
          onMigrateData={() => { void migrateTmdbIds() }}
        />
      </div>

      {drawerOpen && (
        <AppDrawer
          onClose={() => setDrawerOpen(false)}
          showMigrateData={needsTmdbMigration}
          isMigratingData={isMigratingTmdb}
          onMigrateData={() => { void migrateTmdbIds() }}
        />
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
              <MenuIcon className="w-5 h-5" />
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
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies…"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <CloseIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => openMainScreen(MainScreen.MY_LISTS)}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              aria-label="My Lists"
              title="My Lists"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75zM3.75 12h.007v.008H3.75V12zM3.75 17.25h.007v.008H3.75v-.008z" />
              </svg>
            </button>

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
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  <button
                    onClick={() => { setWatchFilter(WatchFilter.ALL); setFilterOpen(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Reset Filter
                  </button>
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
                <SortIcon className="w-5 h-5" />
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
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  <button
                    onClick={() => { setSortOrder(SortOrder.TITLE_ASC); setSortOpen(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Reset Sort
                  </button>
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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
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
            <div className="flex flex-col items-center justify-center py-10 text-center">
              {searchQuery ? (
                <>
                  <SearchIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" strokeWidth={1} />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No movies match &ldquo;{searchQuery}&rdquo;</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Check the spelling</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">or</p>
                  <button
                    onClick={() => navigate('/movies/new', { state: { initialTmdbQuery: searchQuery } })}
                    className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Add Movie
                  </button>
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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {filteredAndSorted.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
              {isLoadingMore && (
                <div className="col-span-full flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <div ref={sentinelRef} className="col-span-full" aria-hidden="true" />
            </div>
          )}
        </main>

        {/* FAB */}
        <button
          onClick={() => navigate('/movies/new', { state: { activeListId, lists: lists.map((l) => ({ id: l.id, name: l.name })) } })}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20"
          aria-label="Add movie"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>

      {deletedToast && (
        <Toast message={`"${deletedToast}" deleted`} onDismiss={() => setDeletedToast(null)} />
      )}

      {autoWhatsNew && (
        <WhatsNewDialog notes={autoWhatsNew.notes} onClose={dismissAutoWhatsNew} />
      )}

      {migrationCandidate && (
        <TmdbMigrationPickerDialog
          movie={migrationCandidate}
          onPick={(id, mediaType) => { void confirmMigrationMatch(id, mediaType) }}
          onSkip={() => { void skipMigrationMatch() }}
        />
      )}

      {isMigratingTmdb && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="alert"
          aria-busy="true"
          aria-label="Migrating data"
        >
          <div className="flex flex-col items-center gap-3 px-6 py-5 bg-white dark:bg-gray-900 rounded-2xl shadow-xl">
            <svg
              className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <p className="text-sm text-gray-700 dark:text-gray-300">Migrating data…</p>
          </div>
        </div>
      )}
    </div>
  )
}
