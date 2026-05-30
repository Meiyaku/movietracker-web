import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MainScreenProvider, useMainScreen } from '../../context/MainScreenContext'
import { MainScreen } from '../../types'

const STORAGE_KEY = 'movietracker_main_screen'

function Consumer() {
  const { mainScreen, activeMainScreen, setMainScreen, openMainScreen } = useMainScreen()
  return (
    <div>
      <span data-testid="pref">{mainScreen}</span>
      <span data-testid="active">{activeMainScreen}</span>
      <button onClick={() => openMainScreen(MainScreen.MY_LISTS)}>Open My Lists</button>
      <button onClick={() => openMainScreen(MainScreen.MOVIES)}>Open Movies</button>
      <button onClick={() => setMainScreen(MainScreen.MY_LISTS)}>Set My Lists Pref</button>
      <button onClick={() => setMainScreen(MainScreen.MOVIES)}>Set Movies Pref</button>
    </div>
  )
}

function renderConsumer() {
  return render(
    <MainScreenProvider>
      <Consumer />
    </MainScreenProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('MainScreenProvider', () => {
  it('defaults to MY_LISTS for both preference and active screen', () => {
    renderConsumer()
    expect(screen.getByTestId('pref').textContent).toBe(MainScreen.MY_LISTS)
    expect(screen.getByTestId('active').textContent).toBe(MainScreen.MY_LISTS)
  })

  it('reads the stored preference from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, MainScreen.MOVIES)
    renderConsumer()
    expect(screen.getByTestId('pref').textContent).toBe(MainScreen.MOVIES)
    expect(screen.getByTestId('active').textContent).toBe(MainScreen.MOVIES)
  })

  it('ignores an invalid stored preference', () => {
    localStorage.setItem(STORAGE_KEY, 'INVALID')
    renderConsumer()
    expect(screen.getByTestId('pref').textContent).toBe(MainScreen.MY_LISTS)
  })

  it('openMainScreen changes the active screen without touching the preference', async () => {
    const user = userEvent.setup()
    renderConsumer()
    await user.click(screen.getByText('Open Movies'))
    expect(screen.getByTestId('active').textContent).toBe(MainScreen.MOVIES)
    expect(screen.getByTestId('pref').textContent).toBe(MainScreen.MY_LISTS)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('setMainScreen updates and persists the preference', async () => {
    const user = userEvent.setup()
    renderConsumer()
    await user.click(screen.getByText('Set Movies Pref'))
    expect(screen.getByTestId('pref').textContent).toBe(MainScreen.MOVIES)
    expect(screen.getByTestId('active').textContent).toBe(MainScreen.MOVIES)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(MainScreen.MOVIES)
  })

  it('setMainScreen clears a session override so the new preference shows through', async () => {
    const user = userEvent.setup()
    renderConsumer()
    // Session override to Movies.
    await user.click(screen.getByText('Open Movies'))
    expect(screen.getByTestId('active').textContent).toBe(MainScreen.MOVIES)
    // Explicitly setting the preference to My Lists must clear the override.
    await user.click(screen.getByText('Set My Lists Pref'))
    expect(screen.getByTestId('pref').textContent).toBe(MainScreen.MY_LISTS)
    expect(screen.getByTestId('active').textContent).toBe(MainScreen.MY_LISTS)
  })
})
