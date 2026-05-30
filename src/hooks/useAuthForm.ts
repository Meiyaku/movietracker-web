import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signUp, sendPasswordReset } from '../services/authService'
import { createDefaultList } from '../services/movieListService'
import { recordError } from '../services/logger'

export type AuthTab = 'login' | 'signup'

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

function extractErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: string }).code)
  }
  return ''
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * Owns auth form state and the sign-in / sign-up / password-reset flows.
 * The AuthPage component renders the form and dialogs.
 */
export function useAuthForm() {
  const navigate = useNavigate()

  const [tab, setTab] = useState<AuthTab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Forgot password dialog state
  const [showForgot, setShowForgot] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  function switchTab(t: AuthTab) {
    setTab(t)
    setError(null)
    setPassword('')
    setConfirm('')
    setShowPassword(false)
    setShowConfirm(false)
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      recordError(err, 'signIn')
      setError(getAuthErrorMessage(extractErrorCode(err)))
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      const user = await signUp(email, password)
      await createDefaultList(user.uid)
      navigate('/')
    } catch (err) {
      recordError(err, 'signUp')
      setError(getAuthErrorMessage(extractErrorCode(err)))
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordReset(e: FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    try {
      await sendPasswordReset(resetEmail)
      setResetSent(true)
    } catch (err) {
      recordError(err, 'passwordReset')
      // Show generic success to avoid user enumeration
      setResetSent(true)
    } finally {
      setResetLoading(false)
    }
  }

  function openForgot() {
    setShowForgot(true)
    setResetEmail(email)
    setResetSent(false)
  }

  return {
    tab,
    switchTab,
    email,
    setEmail,
    password,
    setPassword,
    confirm,
    setConfirm,
    loading,
    error,
    showPassword,
    setShowPassword,
    showConfirm,
    setShowConfirm,
    showForgot,
    setShowForgot,
    resetEmail,
    setResetEmail,
    resetLoading,
    resetSent,
    handleLogin,
    handleSignUp,
    handlePasswordReset,
    openForgot,
  }
}
