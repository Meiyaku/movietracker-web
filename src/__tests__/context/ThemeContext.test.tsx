import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from '../../context/ThemeContext'
import { ThemeMode } from '../../types'

function ThemeConsumer() {
  const { themeMode, setThemeMode, isDark } = useTheme()
  return (
    <div>
      <span data-testid="mode">{themeMode}</span>
      <span data-testid="is-dark">{String(isDark)}</span>
      <button onClick={() => setThemeMode(ThemeMode.DARK)}>Set Dark</button>
      <button onClick={() => setThemeMode(ThemeMode.LIGHT)}>Set Light</button>
      <button onClick={() => setThemeMode(ThemeMode.SYSTEM)}>Set System</button>
    </div>
  )
}

let mockMatchMediaDark = false
const mediaListeners: Array<(e: { matches: boolean }) => void> = []

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  mockMatchMediaDark = false
  mediaListeners.length = 0

  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      matches: mockMatchMediaDark,
      addEventListener: (event: string, cb: (e: { matches: boolean }) => void) => {
        mediaListeners.push(cb)
      },
      removeEventListener: vi.fn(),
    })),
  )
})

describe('ThemeProvider', () => {
  it('defaults to SYSTEM mode', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('mode').textContent).toBe(ThemeMode.SYSTEM)
  })

  it('reads stored theme from localStorage', () => {
    localStorage.setItem('movietracker_theme', ThemeMode.DARK)
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('mode').textContent).toBe(ThemeMode.DARK)
  })

  it('ignores invalid stored theme', () => {
    localStorage.setItem('movietracker_theme', 'INVALID')
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('mode').textContent).toBe(ThemeMode.SYSTEM)
  })

  it('isDark is true when mode is DARK', () => {
    localStorage.setItem('movietracker_theme', ThemeMode.DARK)
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('is-dark').textContent).toBe('true')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('isDark is false when mode is LIGHT', () => {
    localStorage.setItem('movietracker_theme', ThemeMode.LIGHT)
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('is-dark').textContent).toBe('false')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('isDark follows system preference in SYSTEM mode', () => {
    mockMatchMediaDark = true
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('is-dark').textContent).toBe('true')
  })

  it('setThemeMode updates mode and persists to localStorage', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )
    await user.click(screen.getByText('Set Dark'))
    expect(screen.getByTestId('mode').textContent).toBe(ThemeMode.DARK)
    expect(localStorage.getItem('movietracker_theme')).toBe(ThemeMode.DARK)
  })

  it('adds dark class to documentElement when isDark becomes true', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )
    await user.click(screen.getByText('Set Dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class when switching to LIGHT', async () => {
    const user = userEvent.setup()
    localStorage.setItem('movietracker_theme', ThemeMode.DARK)
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )
    await user.click(screen.getByText('Set Light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('responds to system preference changes in SYSTEM mode', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('is-dark').textContent).toBe('false')
    act(() => {
      // simulate system going dark
      mockMatchMediaDark = true
      mediaListeners.forEach((cb) => cb({ matches: true }))
    })
    expect(screen.getByTestId('is-dark').textContent).toBe('true')
  })
})
