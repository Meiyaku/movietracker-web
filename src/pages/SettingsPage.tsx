import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeMode, MainScreen } from '../types'
import { useTheme } from '../context/ThemeContext'
import { useMainScreen } from '../context/MainScreenContext'
import { useAuth } from '../context/AuthContext'
import { deleteAccount } from '../services/authService'
import { deleteAllMovies } from '../services/movieService'
import { deleteAllLists } from '../services/movieListService'
import { recordError } from '../services/logger'

const themeOptions: { value: ThemeMode; label: string; description: string }[] = [
  {
    value: ThemeMode.LIGHT,
    label: 'Light',
    description: 'Always use the light theme',
  },
  {
    value: ThemeMode.DARK,
    label: 'Dark',
    description: 'Always use the dark theme',
  },
  {
    value: ThemeMode.SYSTEM,
    label: 'System',
    description: 'Follow your device settings',
  },
]

const mainScreenOptions: { value: MainScreen; label: string; description: string }[] = [
  {
    value: MainScreen.MOVIES,
    label: 'Movies & TV Shows',
    description: 'Show your movie list when the app opens',
  },
  {
    value: MainScreen.MY_LISTS,
    label: 'My Lists',
    description: 'Show the My Lists screen when the app opens',
  },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const { themeMode, setThemeMode } = useTheme()
  const { mainScreen, setMainScreen } = useMainScreen()
  const { user } = useAuth()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!showDeleteConfirm || deleting) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowDeleteConfirm(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showDeleteConfirm, deleting])

  async function handleDeleteAccount() {
    if (!user) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await Promise.all([deleteAllMovies(user.uid), deleteAllLists(user.uid)])
      await deleteAccount()
      navigate('/auth', { replace: true })
    } catch (e: unknown) {
      recordError(e, 'deleteAccount')
      const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : ''
      if (code === 'auth/requires-recent-login') {
        setDeleteError('Please sign out and sign back in before deleting your account.')
      } else {
        setDeleteError('Failed to delete account. Please try again.')
      }
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

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
        <h1 className="font-bold text-gray-900 dark:text-white text-base">Settings</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Appearance */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Appearance
            </h2>
          </div>

          <div className="p-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Theme</p>
            <div className="space-y-2">
              {themeOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {option.description}
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="theme"
                    value={option.value}
                    checked={themeMode === option.value}
                    onChange={() => setThemeMode(option.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Main Screen */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Start Up Main Screen
            </h2>
          </div>

          <div className="p-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Screen shown when the app opens
            </p>
            <div className="space-y-2">
              {mainScreenOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {option.description}
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="mainScreen"
                    value={option.value}
                    checked={mainScreen === option.value}
                    onChange={() => setMainScreen(option.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Account
            </h2>
          </div>
          <div className="p-4">
            {deleteError && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                {deleteError}
              </div>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl text-sm font-medium transition-colors"
            >
              Delete Account
            </button>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Permanently deletes your account and all movie data. This cannot be undone.
            </p>
          </div>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              About
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">Version</span>
              <span className="text-sm text-gray-400 dark:text-gray-500">{__APP_VERSION__}</span>
            </div>
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">Data from The Movie Database</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <p className="px-4 pb-3 text-xs text-gray-400 dark:text-gray-500">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Account</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete your account and all your movie data. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
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
