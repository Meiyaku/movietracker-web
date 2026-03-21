import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  Timestamp,
  QuerySnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import { Movie, WatchStatus } from '../types'

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
      console.error('Movie snapshot error:', err)
      onError?.(err)
    },
  )
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
  const snapshot = await new Promise<QuerySnapshot>((resolve, reject) => {
    // onSnapshot fires synchronously for cached data; for fresh data we unsubscribe after first emission
    let resolved = false
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!resolved) {
          resolved = true
          unsub()
          resolve(snap)
        }
      },
      (err) => {
        if (!resolved) {
          resolved = true
          reject(err)
        }
      },
    )
  })

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

function movieToMap(movie: Movie): Record<string, unknown> {
  return {
    title: movie.title,
    year: movie.year !== '' ? Number(movie.year) : null,
    genre: movie.genre || null,
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
