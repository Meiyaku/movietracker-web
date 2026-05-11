import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid', email: 'test@example.com' }, loading: false }),
}))

const mockSetThemeMode = vi.fn()
vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'SYSTEM', setThemeMode: mockSetThemeMode, isDark: false }),
}))

const mockDeleteAccount = vi.fn()
vi.mock('../../services/authService', () => ({
  deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
}))

const mockDeleteAllMovies = vi.fn()
vi.mock('../../services/movieService', () => ({
  deleteAllMovies: (...args: unknown[]) => mockDeleteAllMovies(...args),
}))

const mockDeleteAllLists = vi.fn()
vi.mock('../../services/movieListService', () => ({
  deleteAllLists: (...args: unknown[]) => mockDeleteAllLists(...args),
}))

import { SettingsPage } from '../../pages/SettingsPage'

function renderSettingsPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SettingsPage', () => {
  it('renders theme options', () => {
    renderSettingsPage()
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('System radio is checked by default', () => {
    renderSettingsPage()
    expect(screen.getByDisplayValue('SYSTEM')).toBeChecked()
  })

  it('calls setThemeMode when a theme option is selected', async () => {
    const user = userEvent.setup()
    renderSettingsPage()
    await user.click(screen.getByDisplayValue('DARK'))
    expect(mockSetThemeMode).toHaveBeenCalledWith('DARK')
  })

  it('navigates back on back button click', async () => {
    const user = userEvent.setup()
    renderSettingsPage()
    await user.click(screen.getByLabelText('Back'))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('shows delete account confirmation dialog', async () => {
    const user = userEvent.setup()
    renderSettingsPage()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    // Modal heading appears
    expect(screen.getByRole('heading', { name: 'Delete Account' })).toBeInTheDocument()
    // Modal body text appears
    expect(
      screen.getByText(
        'This will permanently delete your account and all your movie data. This cannot be undone.',
      ),
    ).toBeInTheDocument()
  })

  it('cancels delete account dialog', async () => {
    const user = userEvent.setup()
    renderSettingsPage()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('heading', { name: 'Delete Account' })).not.toBeInTheDocument()
  })

  it('deletes account and navigates to /auth on confirm', async () => {
    const user = userEvent.setup()
    mockDeleteAllMovies.mockResolvedValue(undefined)
    mockDeleteAllLists.mockResolvedValue(undefined)
    mockDeleteAccount.mockResolvedValue(undefined)
    renderSettingsPage()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    // The modal confirm button says "Delete", not "Delete Account"
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalled())
    expect(mockNavigate).toHaveBeenCalledWith('/auth', { replace: true })
  })
})
