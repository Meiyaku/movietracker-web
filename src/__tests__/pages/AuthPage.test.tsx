import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}))

const mockSignIn = vi.fn()
const mockSignUp = vi.fn()
const mockSendPasswordReset = vi.fn()
vi.mock('../../services/authService', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
  sendPasswordReset: (...args: unknown[]) => mockSendPasswordReset(...args),
}))

const mockCreateDefaultList = vi.fn()
vi.mock('../../services/movieListService', () => ({
  createDefaultList: (...args: unknown[]) => mockCreateDefaultList(...args),
}))

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, themeMode: 'SYSTEM', setThemeMode: vi.fn() }),
}))

import { AuthPage } from '../../pages/AuthPage'

// Helper: click the submit button (not the tab button which shares the same label)
function getSubmitButton(name: string) {
  return screen.getByText(name, { selector: 'button[type="submit"]' })
}

function renderAuthPage() {
  return render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuthPage', () => {
  it('renders login form by default', () => {
    renderAuthPage()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    // Login tab is active; no Confirm Password field
    expect(screen.queryByText('Confirm Password')).not.toBeInTheDocument()
  })

  it('switches to sign up tab', async () => {
    const user = userEvent.setup()
    renderAuthPage()
    // Only one "Sign Up" button exists while on the login tab
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))
    expect(screen.getByText('Confirm Password')).toBeInTheDocument()
  })

  it('calls signIn and navigates on successful login', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({})
    renderAuthPage()
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await user.click(getSubmitButton('Log In'))
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123'))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('shows error message on failed login', async () => {
    const user = userEvent.setup()
    mockSignIn.mockRejectedValue({ code: 'auth/invalid-credential' })
    renderAuthPage()
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpassword')
    await user.click(getSubmitButton('Log In'))
    await waitFor(() =>
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument(),
    )
  })

  it('shows password mismatch error on sign up', async () => {
    const user = userEvent.setup()
    renderAuthPage()
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
    const [passwordInput, confirmInput] = screen.getAllByPlaceholderText('••••••••')
    await user.type(passwordInput, 'password123')
    await user.type(confirmInput, 'different456')
    await user.click(getSubmitButton('Sign Up'))
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('calls signUp, creates default list, and navigates on success', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ user: { uid: 'new-uid' } })
    mockCreateDefaultList.mockResolvedValue('list-id')
    renderAuthPage()
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))
    await user.type(screen.getByPlaceholderText('you@example.com'), 'new@example.com')
    const [passwordInput, confirmInput] = screen.getAllByPlaceholderText('••••••••')
    await user.type(passwordInput, 'password123')
    await user.type(confirmInput, 'password123')
    await user.click(getSubmitButton('Sign Up'))
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'password123'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })

  it('opens forgot password dialog', async () => {
    const user = userEvent.setup()
    renderAuthPage()
    await user.click(screen.getByText('Forgot Password?'))
    expect(screen.getByText('Reset Password')).toBeInTheDocument()
  })
})
