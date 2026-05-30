import React, { createContext, useContext, useState } from 'react'
import { MainScreen } from '../types'

interface MainScreenContextValue {
  /** The persisted preference for which screen the app opens on. */
  mainScreen: MainScreen
  /** Updates the persisted preference. Clears any session override. */
  setMainScreen: (screen: MainScreen) => void
  /** The screen to show right now: a session override if set, else the preference. */
  activeMainScreen: MainScreen
  /** Switches the visible screen for this session only, without touching the preference. */
  openMainScreen: (screen: MainScreen) => void
}

const MainScreenContext = createContext<MainScreenContextValue>({
  mainScreen: MainScreen.MY_LISTS,
  setMainScreen: () => {},
  activeMainScreen: MainScreen.MY_LISTS,
  openMainScreen: () => {},
})

const STORAGE_KEY = 'movietracker_main_screen'

export function MainScreenProvider({ children }: { children: React.ReactNode }) {
  const [mainScreen, setMainScreenState] = useState<MainScreen>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && Object.values(MainScreen).includes(stored as MainScreen)) {
      return stored as MainScreen
    }
    return MainScreen.MY_LISTS
  })

  const [override, setOverride] = useState<MainScreen | null>(null)

  function setMainScreen(screen: MainScreen) {
    setMainScreenState(screen)
    localStorage.setItem(STORAGE_KEY, screen)
    setOverride(null)
  }

  function openMainScreen(screen: MainScreen) {
    setOverride(screen)
  }

  return (
    <MainScreenContext.Provider
      value={{
        mainScreen,
        setMainScreen,
        activeMainScreen: override ?? mainScreen,
        openMainScreen,
      }}
    >
      {children}
    </MainScreenContext.Provider>
  )
}

export function useMainScreen(): MainScreenContextValue {
  return useContext(MainScreenContext)
}
