import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUser = { uid: 'user1', email: 'test@example.com' }

const mockCreateUser = vi.fn()
const mockSignIn = vi.fn()
const mockSendReset = vi.fn()
const mockSignOut = vi.fn()
const mockDeleteUser = vi.fn()
const mockOnAuthStateChanged = vi.fn()
const mockCurrentUser = { value: null as typeof mockUser | null }

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUser(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignIn(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mockSendReset(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}))

vi.mock('../../firebase', () => ({
  auth: new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'currentUser') return mockCurrentUser.value
        return undefined
      },
    },
  ),
  db: {},
}))

// Import after mocks are set up
const { onAuthChange, signUp, signIn, sendPasswordReset, signOut, getCurrentUser, deleteAccount } = await import(
  '../../services/authService'
)

beforeEach(() => {
  vi.clearAllMocks()
  mockCurrentUser.value = null
  mockDeleteUser.mockResolvedValue(undefined)
})

describe('onAuthChange', () => {
  it('calls onAuthStateChanged and returns unsubscribe function', () => {
    const unsub = vi.fn()
    mockOnAuthStateChanged.mockReturnValue(unsub)
    const cb = vi.fn()
    const result = onAuthChange(cb)
    expect(mockOnAuthStateChanged).toHaveBeenCalledWith(expect.anything(), cb)
    expect(result).toBe(unsub)
  })
})

describe('signUp', () => {
  it('returns user from createUserWithEmailAndPassword', async () => {
    mockCreateUser.mockResolvedValue({ user: mockUser })
    const user = await signUp('test@example.com', 'password123')
    expect(mockCreateUser).toHaveBeenCalledWith(expect.anything(), 'test@example.com', 'password123')
    expect(user).toBe(mockUser)
  })

  it('propagates errors', async () => {
    mockCreateUser.mockRejectedValue(new Error('email-already-in-use'))
    await expect(signUp('taken@example.com', 'pass')).rejects.toThrow('email-already-in-use')
  })
})

describe('signIn', () => {
  it('returns user from signInWithEmailAndPassword', async () => {
    mockSignIn.mockResolvedValue({ user: mockUser })
    const user = await signIn('test@example.com', 'password123')
    expect(mockSignIn).toHaveBeenCalledWith(expect.anything(), 'test@example.com', 'password123')
    expect(user).toBe(mockUser)
  })

  it('propagates errors', async () => {
    mockSignIn.mockRejectedValue(new Error('wrong-password'))
    await expect(signIn('test@example.com', 'wrong')).rejects.toThrow('wrong-password')
  })
})

describe('sendPasswordReset', () => {
  it('calls sendPasswordResetEmail', async () => {
    mockSendReset.mockResolvedValue(undefined)
    await sendPasswordReset('test@example.com')
    expect(mockSendReset).toHaveBeenCalledWith(expect.anything(), 'test@example.com')
  })

  it('propagates errors', async () => {
    mockSendReset.mockRejectedValue(new Error('user-not-found'))
    await expect(sendPasswordReset('none@example.com')).rejects.toThrow('user-not-found')
  })
})

describe('signOut', () => {
  it('calls firebase signOut', async () => {
    mockSignOut.mockResolvedValue(undefined)
    await signOut()
    expect(mockSignOut).toHaveBeenCalledWith(expect.anything())
  })
})

describe('getCurrentUser', () => {
  it('returns current user from auth', () => {
    mockCurrentUser.value = mockUser
    expect(getCurrentUser()).toBe(mockUser)
  })

  it('returns null when not logged in', () => {
    mockCurrentUser.value = null
    expect(getCurrentUser()).toBeNull()
  })
})

describe('deleteAccount', () => {
  it('calls deleteUser with the current user', async () => {
    mockCurrentUser.value = mockUser
    await deleteAccount()
    expect(mockDeleteUser).toHaveBeenCalledWith(mockUser)
  })

  it('throws when no user is logged in', async () => {
    mockCurrentUser.value = null
    await expect(deleteAccount()).rejects.toThrow('Not authenticated')
  })

  it('propagates errors from deleteUser', async () => {
    mockCurrentUser.value = mockUser
    mockDeleteUser.mockRejectedValue(new Error('requires-recent-login'))
    await expect(deleteAccount()).rejects.toThrow('requires-recent-login')
  })
})
