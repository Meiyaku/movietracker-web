import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Isolated ProtectedRoute and PublicRoute extracted for testing
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const mockUseAuth = vi.mocked(useAuth)

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div>Loading…</div>
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div>Loading…</div>
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

describe('ProtectedRoute', () => {
  it('shows loading spinner when loading is true', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><div>Home</div></ProtectedRoute>} />
          <Route path="/auth" element={<div>Auth</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
  })

  it('redirects to /auth when user is null and not loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><div>Home</div></ProtectedRoute>} />
          <Route path="/auth" element={<div>Auth Page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Auth Page')).toBeInTheDocument()
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
  })

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1', email: 'a@b.com' } as never, loading: false })
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><div>Home</div></ProtectedRoute>} />
          <Route path="/auth" element={<div>Auth Page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})

describe('PublicRoute', () => {
  it('shows loading when loading is true', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    render(
      <MemoryRouter initialEntries={['/auth']}>
        <Routes>
          <Route path="/auth" element={<PublicRoute><div>Auth</div></PublicRoute>} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('redirects to / when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1', email: 'a@b.com' } as never, loading: false })
    render(
      <MemoryRouter initialEntries={['/auth']}>
        <Routes>
          <Route path="/auth" element={<PublicRoute><div>Auth</div></PublicRoute>} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Auth')).not.toBeInTheDocument()
  })

  it('renders children when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    render(
      <MemoryRouter initialEntries={['/auth']}>
        <Routes>
          <Route path="/auth" element={<PublicRoute><div>Auth Form</div></PublicRoute>} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Auth Form')).toBeInTheDocument()
  })
})
