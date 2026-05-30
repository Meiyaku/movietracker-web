import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MovieList, MY_MOVIES_LIST_NAME } from '../types'
import { AppDrawer } from '../components/AppDrawer'
import { CreateListDialog } from '../components/dialogs/CreateListDialog'
import { EditListDialog } from '../components/dialogs/EditListDialog'
import { DeleteListDialog } from '../components/dialogs/DeleteListDialog'
import { useMyLists, type ListSort } from '../hooks/useMyLists'
import { MenuIcon, SearchIcon, CloseIcon, SortIcon, SettingsIcon, PlusIcon } from '../components/icons'

const chipColors = [
  'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
  'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300',
  'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300',
  'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300',
]
const defaultChipColor = 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300'

function chipColorFor(list: MovieList): string {
  if (list.name === MY_MOVIES_LIST_NAME) return defaultChipColor
  const hash = [...list.id].reduce((sum, c) => sum + c.charCodeAt(0), 0)
  return chipColors[hash % chipColors.length]
}

const sortOptions: { value: ListSort; label: string }[] = [
  { value: 'NAME_ASC', label: 'Name (A–Z)' },
  { value: 'NAME_DESC', label: 'Name (Z–A)' },
  { value: 'COUNT_DESC', label: 'Movie Count (High–Low)' },
  { value: 'COUNT_ASC', label: 'Movie Count (Low–High)' },
]

export function MyListsPage() {
  const navigate = useNavigate()
  const {
    lists,
    sortedLists,
    loading,
    movieCounts,
    countsReady,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    openListInMovies,
    openMovies,
    createList,
    editList,
    deleteList,
  } = useMyLists()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [showCreateList, setShowCreateList] = useState(false)
  const [listToEdit, setListToEdit] = useState<MovieList | null>(null)
  const [listToDelete, setListToDelete] = useState<MovieList | null>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sortMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [sortMenuOpen])

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Sidebar (desktop) */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:flex-shrink-0">
        <AppDrawer onClose={() => {}} />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <AppDrawer onClose={() => setDrawerOpen(false)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <h1 className="flex-1 font-bold text-gray-900 dark:text-white text-base">My Lists</h1>
          <button
            onClick={openMovies}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Movie List"
            title="Movie List"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
            </svg>
          </button>
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setSortMenuOpen((o) => !o)}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Sort lists"
              aria-expanded={sortMenuOpen}
              title="Sort lists"
            >
              <SortIcon className="w-5 h-5" />
            </button>
            {sortMenuOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortOrder(opt.value); setSortMenuOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${sortOrder === opt.value ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-900 dark:text-white'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
          </div>

          <div className="relative mt-3">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lists…"
              className="w-full pl-9 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Clear search"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl lg:max-w-6xl mx-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : lists.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-24 px-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">No lists yet.</p>
              </div>
            ) : sortedLists.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-24 px-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">No lists match your search.</p>
              </div>
            ) : (
              <div className="space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3">
                {sortedLists.map((list) => {
                  const isDefault = list.name === MY_MOVIES_LIST_NAME
                  const count = countsReady ? (movieCounts[list.id] ?? 0) : undefined
                  return (
                    <div
                      key={list.id}
                      className="flex items-center gap-2 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all"
                    >
                      <button
                        onClick={() => openListInMovies(list.id)}
                        className="flex items-center gap-3.5 flex-1 min-w-0 text-left"
                      >
                        <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${chipColorFor(list)}`}>
                          <svg
                            className="w-5 h-5"
                            fill={isDefault ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            {isDefault ? (
                              <path d="M11.48 3.5a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                          </svg>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {list.name}
                          </span>
                          {list.subtitle && (
                            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                              {list.subtitle}
                            </span>
                          )}
                        </span>
                      </button>
                      {count !== undefined && (
                        <span className="shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-semibold px-2.5 py-0.5 tabular-nums">
                          {count}
                        </span>
                      )}
                      {!isDefault && (
                        <>
                          <button
                            onClick={() => setListToEdit(list)}
                            aria-label="Edit list"
                            title="Edit"
                            className="shrink-0 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setListToDelete(list)}
                            aria-label="Delete list"
                            title="Delete"
                            className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                      <svg className="w-4 h-4 shrink-0 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Add-list FAB */}
        <button
          onClick={() => setShowCreateList(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20"
          aria-label="Add list"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>

      {showCreateList && (
        <CreateListDialog onConfirm={createList} onClose={() => setShowCreateList(false)} />
      )}

      {listToEdit && (
        <EditListDialog
          list={listToEdit}
          onConfirm={(name, subtitle, description) => editList(listToEdit, name, subtitle, description)}
          onClose={() => setListToEdit(null)}
        />
      )}

      {listToDelete && (
        <DeleteListDialog
          listName={listToDelete.name}
          onConfirm={() => deleteList(listToDelete)}
          onClose={() => setListToDelete(null)}
        />
      )}
    </div>
  )
}
