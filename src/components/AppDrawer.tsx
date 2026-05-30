import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '../services/authService'
import { fetchRemoteConfig, whatsNew } from '../services/remoteConfigService'
import { useAuth } from '../context/AuthContext'
import { WhatsNewDialog } from './dialogs/WhatsNewDialog'
import { CloseIcon, SettingsIcon } from './icons'

interface AppDrawerProps {
  onClose: () => void
  showMigrateData?: boolean
  isMigratingData?: boolean
  onMigrateData?: () => void
}

export function AppDrawer({
  onClose,
  showMigrateData = false,
  isMigratingData = false,
  onMigrateData,
}: AppDrawerProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const [whatsNewNotes, setWhatsNewNotes] = useState('')

  useEffect(() => {
    fetchRemoteConfig().then(() => setWhatsNewNotes(whatsNew()))
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
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
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nav links */}
        <div className="p-3 flex flex-col gap-2">
          <button
            onClick={() => setShowWhatsNew(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors w-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            What&apos;s New
          </button>
          {showMigrateData && (
            <button
              onClick={() => {
                if (isMigratingData) return
                onMigrateData?.()
                onClose()
              }}
              disabled={isMigratingData}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 rounded-lg transition-colors w-full"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Migrate Data
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { navigate('/settings'); onClose() }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-1"
            >
              <SettingsIcon className="w-4 h-4" />
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
        </div>
      </aside>

      {showWhatsNew && (
        <WhatsNewDialog notes={whatsNewNotes} onClose={() => setShowWhatsNew(false)} />
      )}
    </>
  )
}
