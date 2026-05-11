import {
  collection,
  doc,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  Timestamp,
  QuerySnapshot,
  QueryDocumentSnapshot,
  DocumentSnapshot,
  QueryConstraint,
} from 'firebase/firestore'
import { db } from '../firebase'
import { Movie, WatchStatus } from '../types'
import { recordError } from './logger'

export class StaleCursorError extends Error {
  constructor(cursorId: string) {
    super(`Stale cursor: document ${cursorId} no longer exists`)
    this.name = 'StaleCursorError'
  }
}

export interface MoviesPage {
  movies: Movie[]
  lastDoc: DocumentSnapshot | null
  hasMore: boolean
}

function moviesCollection(uid: string) {
  return collection(db, 'users', uid, 'movies')
}

function docFromSnapshot(d: QueryDocumentSnapshot): Movie {
  const data = d.data()
  const statusStr: string = typeof data['status'] === 'string' ? data['status'] : WatchStatus.WANT_TO_WATCH
  const status = Object.values(WatchStatus).includes(statusStr as WatchStatus)
    ? (statusStr as WatchStatus)
    : WatchStatus.WANT_TO_WATCH

  return {
    id: d.id,
    title: typeof data['title'] === 'string' ? data['title'] : '',
    year: data['year'] != null ? String(data['year']) : '',
    genre: typeof data['genre'] === 'string' ? data['genre'] : '',
    status,
    rating: data['rating'] != null ? Number(data['rating']) : null,
    description: typeof data['description'] === 'string' ? data['description'] : '',
    notes: typeof data['notes'] === 'string' ? data['notes'] : '',
    trailerUrl: typeof data['trailerUrl'] === 'string' ? data['trailerUrl'] : '',
    posterUrl: typeof data['posterUrl'] === 'string' ? data['posterUrl'] : '',
    listIds: Array.isArray(data['listIds'])
      ? (data['listIds'] as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
    createdAt: data['createdAt'] instanceof Timestamp ? data['createdAt'] : Timestamp.now(),
  }
}

export function subscribeToMoviesForList(
  uid: string,
  listId: string,
  onData: (movies: Movie[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(moviesCollection(uid), where('listIds', 'array-contains', listId))
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const movies = snapshot.docs.map((d) => docFromSnapshot(d))
      onData(movies)
    },
    (err) => {
      recordError(err, 'subscribeToMoviesForList')
      onError?.(err)
    },
  )
}

export function subscribeToAllMovies(
  uid: string,
  onData: (movies: Movie[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    moviesCollection(uid),
    (snapshot: QuerySnapshot) => onData(snapshot.docs.map(docFromSnapshot)),
    (err) => {
      recordError(err, 'subscribeToAllMovies')
      onError?.(err)
    },
  )
}

export async function getMoviesPage(
  uid: string,
  listId: string,
  pageSizeCount: number,
  cursor?: DocumentSnapshot,
): Promise<MoviesPage> {
  if (cursor) {
    const cursorDoc = await getDoc(cursor.ref)
    if (!cursorDoc.exists()) throw new StaleCursorError(cursor.id)
  }

  const constraints: QueryConstraint[] = [
    where('listIds', 'array-contains', listId),
    orderBy('createdAt', 'desc'),
    limit(pageSizeCount),
  ]
  if (cursor) constraints.push(startAfter(cursor))

  const snapshot = await getDocs(query(moviesCollection(uid), ...constraints))
  return {
    movies: snapshot.docs.map(docFromSnapshot),
    lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? null,
    hasMore: snapshot.size === pageSizeCount,
  }
}

export async function getMovie(uid: string, id: string): Promise<Movie | null> {
  const snap = await getDoc(doc(moviesCollection(uid), id))
  if (!snap.exists()) return null
  return docFromSnapshot(snap)
}

export async function addMovie(uid: string, movie: Omit<Movie, 'id' | 'createdAt'>): Promise<string> {
  const data = movieToMap({ ...movie, id: '', createdAt: Timestamp.now() })
  const ref = await addDoc(moviesCollection(uid), data)
  return ref.id
}

export async function updateMovie(uid: string, movie: Movie): Promise<void> {
  await setDoc(doc(moviesCollection(uid), movie.id), movieToMap(movie))
}

export async function deleteMovie(uid: string, movieId: string): Promise<void> {
  await deleteDoc(doc(moviesCollection(uid), movieId))
}

export async function removeListFromAllMovies(uid: string, listId: string): Promise<void> {
  const q = query(moviesCollection(uid), where('listIds', 'array-contains', listId))
  const snapshot = await getDocs(q)

  if (snapshot.empty) return

  const batch = writeBatch(db)
  snapshot.docs.forEach((d) => {
    const current = Array.isArray(d.data().listIds)
      ? (d.data().listIds as string[]).filter((id) => id !== listId)
      : []
    batch.update(d.ref, { listIds: current })
  })
  await batch.commit()
}

function buildDedupeKey(title: string, year: string, genre: string): string {
  return `${title.trim().toLowerCase()}|${year}|${genre.trim().toLowerCase()}`
}

export async function checkDuplicate(
  uid: string,
  title: string,
  year: string,
  genre: string,
  excludeId?: string,
): Promise<boolean> {
  const key = buildDedupeKey(title, year, genre)
  const q = query(moviesCollection(uid), where('dedupeKey', '==', key))
  const snapshot = await getDocs(q)
  return snapshot.docs.some((d) => d.id !== (excludeId ?? ''))
}

function movieToMap(movie: Movie): Record<string, unknown> {
  const title = movie.title.trim()
  const year = movie.year !== '' ? movie.year : ''
  const genre = (movie.genre || '').trim()
  return {
    title,
    year: year !== '' ? Number(year) : null,
    genre: genre || null,
    dedupeKey: buildDedupeKey(title, year, genre),
    status: movie.status,
    rating: movie.rating,
    description: movie.description || null,
    notes: movie.notes || null,
    trailerUrl: movie.trailerUrl || null,
    posterUrl: movie.posterUrl || null,
    listIds: movie.listIds,
    createdAt: movie.createdAt,
  }
}

export async function deleteAllMovies(uid: string): Promise<void> {
  const snapshot = await getDocs(moviesCollection(uid))
  if (snapshot.empty) return
  const CHUNK = 500
  for (let i = 0; i < snapshot.docs.length; i += CHUNK) {
    const batch = writeBatch(db)
    snapshot.docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}
