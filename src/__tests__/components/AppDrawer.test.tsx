import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppDrawer } from '../../components/AppDrawer'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockSignOut = vi.fn()
vi.mock('../../services/authService', () => ({ signOut: () => mockSignOut() }))
vi.mock('../../services/remoteConfigService', () => ({
  fetchRemoteConfig: () => Promise.resolve(),
  whatsNew: () => 'Test release notes.',
}))

const mockUser = { uid: 'uid1', email: 'user@test.com' }
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}))

function renderDrawer(onClose: () => void = vi.fn()) {
  return render(
    <MemoryRouter>
      <AppDrawer onClose={onClose} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSignOut.mockResolvedValue(undefined)
})

describe('AppDrawer', () => {
  it('renders Movie Tracker heading', () => {
    renderDrawer()
    expect(screen.getByText('Movie Tracker')).toBeInTheDocument()
  })

  it('shows user email', () => {
    renderDrawer()
    expect(screen.getByText('user@test.com')).toBeInTheDocument()
  })

  it('navigates to settings and closes on Settings click', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderDrawer(onClose)
    await user.click(screen.getByText('Settings'))
    expect(mockNavigate).toHaveBeenCalledWith('/settings')
    expect(onClose).toHaveBeenCalled()
  })

  it('signs out and navigates to /auth on Log Out click', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByText('Log Out'))
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled())
    expect(mockNavigate).toHaveBeenCalledWith('/auth')
  })

  it('opens the What\'s New dialog when What\'s New is clicked', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByText("What's New"))
    expect(await screen.findByText('Test release notes.')).toBeInTheDocument()
  })

  it('calls onClose when the overlay is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderDrawer(onClose)
    const overlay = document.querySelector('.bg-black\\/40') as HTMLElement
    await user.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })
})
