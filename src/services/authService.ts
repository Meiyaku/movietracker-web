import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import { auth } from '../firebase'

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}

export async function signUp(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function signIn(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export function getCurrentUser(): User | null {
  return auth.currentUser
}
