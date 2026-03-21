import React, { createContext, useContext, useEffect, useState } from 'react'
import { ThemeMode } from '../types'

interface ThemeContextValue {
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: ThemeMode.SYSTEM,
  setThemeMode: () => {},
  isDark: false,
})

const STORAGE_KEY = 'movietracker_theme'

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === ThemeMode.DARK) return true
  if (mode === ThemeMode.LIGHT) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && Object.values(ThemeMode).includes(stored as ThemeMode)) {
      return stored as ThemeMode
    }
    return ThemeMode.SYSTEM
  })

  const [isDark, setIsDark] = useState(() => resolveIsDark(themeMode))

  useEffect(() => {
    const update = () => setIsDark(resolveIsDark(themeMode))
    update()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [themeMode])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  function setThemeMode(mode: ThemeMode) {
    setThemeModeState(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
