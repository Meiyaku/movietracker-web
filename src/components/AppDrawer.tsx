import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MovieList, MY_MOVIES_LIST_NAME } from '../types'
import { signOut } from '../services/authService'
import { renameList, deleteList, createList } from '../services/movieListService'
import { removeListFromAllMovies } from '../services/movieService'
import { useAuth } from '../context/AuthContext'
import { CreateListDialog } from './dialogs/CreateListDialog'
import { RenameListDialog } from './dialogs/RenameListDialog'
import { DeleteListDialog } from './dialogs/DeleteListDialog'

interface AppDrawerProps {
  lists: MovieList[]
  activeListId: string | null
  onSelectList: (id: string) => void
  onClose: () => void
}

type DialogState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'rename'; list: MovieList }
  | { type: 'delete'; list: MovieList }

export function AppDrawer({ lists, activeListId, onSelectList, onClose }: AppDrawerProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' })

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  async function handleCreateList(name: string) {
    if (!user) return
    await createList(user.uid, name)
  }

  async function handleRenameList(list: MovieList, newName: string) {
    if (!user) return
    await renameList(user.uid, list.id, newName)
  }

  async function handleDeleteList(list: MovieList) {
    if (!user) return
    await removeListFromAllMovies(user.uid, list.id)
    await deleteList(user.uid, list.id)
    // If we deleted the active list, reset to My Movies
    if (activeListId === list.id) {
      const myMovies = lists.find((l) => l.name === MY_MOVIES_LIST_NAME)
      if (myMovies) onSelectList(myMovies.id)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-gray-900 shadow-2xl flex flex-col lg:static lg:shadow-none lg:border-r lg:border-gray-200 lg:dark:border-gray-700">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-700 to-blue-900 dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Movie Tracker</h1>
              {user && (
                <p className="text-xs text-blue-200 dark:text-gray-400 mt-0.5 truncate max-w-[180px]">
                  {user.email}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-white/70 hover:text-white transition-colors"
              aria-label="Close drawer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Nav links */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            onClick={() => { navigate('/settings'); onClose() }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Log Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log Out
          </button>
        </div>

        {/* Lists header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            My Lists
          </span>
          <button
            onClick={() => setDialog({ type: 'create' })}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New List
          </button>
        </div>

        {/* Lists */}
        <div className="flex-1 overflow-y-auto py-2">
          {lists.map((list) => {
            const isMyMovies = list.name === MY_MOVIES_LIST_NAME
            const isActive = list.id === activeListId
            return (
              <div
                key={list.id}
                className={`flex items-center group mx-2 mb-0.5 rounded-lg ${
                  isActive ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <button
                  onClick={() => { onSelectList(list.id); onClose() }}
                  className="flex-1 text-left px-3 py-2.5 text-sm"
                >
                  <span
                    className={`${
                      isActive
                        ? 'font-bold text-blue-700 dark:text-blue-400'
                        : 'font-medium text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {list.name}
                  </span>
                </button>
                {!isMyMovies && (
                  <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setDialog({ type: 'rename', list })}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      title="Rename"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDialog({ type: 'delete', list })}
                      className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      {/* Dialogs */}
      {dialog.type === 'create' && (
        <CreateListDialog onConfirm={handleCreateList} onClose={() => setDialog({ type: 'none' })} />
      )}
      {dialog.type === 'rename' && (
        <RenameListDialog
          currentName={dialog.list.name}
          onConfirm={(name) => handleRenameList(dialog.list, name)}
          onClose={() => setDialog({ type: 'none' })}
        />
      )}
      {dialog.type === 'delete' && (
        <DeleteListDialog
          listName={dialog.list.name}
          onConfirm={() => handleDeleteList(dialog.list)}
          onClose={() => setDialog({ type: 'none' })}
        />
      )}
    </>
  )
}
