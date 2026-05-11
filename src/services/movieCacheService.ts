import type { Movie } from '../types'

const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  movies: Movie[]
  savedAt: number
}

function cacheKey(uid: string, listId: string): string {
  return `movietracker_cache_${uid}_${listId}`
}

export function loadCachedMovies(uid: string, listId: string): Movie[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid, listId))
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) return null
    return entry.movies
  } catch {
    return null
  }
}

export function cacheMovies(movies: Movie[], uid: string, listId: string): void {
  try {
    localStorage.setItem(cacheKey(uid, listId), JSON.stringify({ movies, savedAt: Date.now() }))
  } catch {
    // localStorage quota exceeded or unavailable
  }
}

export function invalidateCache(uid: string, listId: string): void {
  try {
    localStorage.removeItem(cacheKey(uid, listId))
  } catch {
    // ignore
  }
}
