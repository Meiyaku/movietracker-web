import { useNavigate } from 'react-router-dom'
import { ThemeMode } from '../types'
import { useTheme } from '../context/ThemeContext'

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

export function SettingsPage() {
  const navigate = useNavigate()
  const { themeMode, setThemeMode } = useTheme()

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

      <div className="max-w-2xl mx-auto p-4">
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

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          Movie Tracker v1.0.0
        </p>
      </div>
    </div>
  )
}
