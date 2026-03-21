import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../context/AuthContext'

type AuthCallback = (user: { uid: string; email: string } | null) => void
let capturedCallback: AuthCallback | null = null

const mockOnAuthChange = vi.fn((cb: AuthCallback) => {
  capturedCallback = cb
  return vi.fn() // unsub
})

vi.mock('../../services/authService', () => ({
  onAuthChange: (cb: AuthCallback) => mockOnAuthChange(cb),
}))

function AuthConsumer() {
  const { user, loading } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  capturedCallback = null
})

describe('AuthProvider', () => {
  it('starts with loading=true and user=null', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('loading').textContent).toBe('true')
    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  it('sets user and loading=false when auth state resolves with a user', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )
    act(() => {
      capturedCallback!({ uid: 'u1', email: 'test@example.com' })
    })
    expect(screen.getByTestId('loading').textContent).toBe('false')
    expect(screen.getByTestId('user').textContent).toBe('test@example.com')
  })

  it('sets user=null when auth state resolves with null', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )
    act(() => {
      capturedCallback!(null)
    })
    expect(screen.getByTestId('loading').textContent).toBe('false')
    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  it('unsubscribes from auth changes on unmount', () => {
    const unsub = vi.fn()
    mockOnAuthChange.mockReturnValueOnce(unsub)
    const { unmount } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )
    unmount()
    expect(unsub).toHaveBeenCalled()
  })
})
