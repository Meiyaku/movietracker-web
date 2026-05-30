import { Movie, TmdbSearchResult } from '../types'
import { searchMovies } from './tmdbService'

export type TmdbAutoMatch =
  | { kind: 'matched'; tmdbId: number; mediaType: string }
  | { kind: 'unmatched' }
  | { kind: 'error' }

function displayTitle(r: TmdbSearchResult): string {
  return (r.title ?? r.name ?? '').toLowerCase()
}

function yearOf(r: TmdbSearchResult): string | null {
  const date = r.releaseDate ?? r.firstAirDate
  return date && date.length >= 4 ? date.slice(0, 4) : null
}

function pickMatch(
  results: TmdbSearchResult[],
  movie: Movie,
): { id: number; mediaType: string } | null {
  const titleLower = movie.title.toLowerCase()
  // Consider both movies and tv shows so a TV title that shares a movie's name isn't
  // silently coerced into a movie.
  const titleMatches = results.filter(
    (r) =>
      (r.mediaType === 'movie' || r.mediaType === 'tv') && displayTitle(r) === titleLower,
  )
  const yearStr = movie.year || null

  if (yearStr) {
    const yearMatches = titleMatches.filter((r) => yearOf(r) === yearStr)
    // Only auto-match when title + year produce exactly one candidate.
    if (yearMatches.length === 1) {
      return { id: yearMatches[0].id, mediaType: yearMatches[0].mediaType }
    }
    return null
  }

  // Without a stored year, only auto-match when there is a single title hit.
  if (titleMatches.length === 1) {
    return { id: titleMatches[0].id, mediaType: titleMatches[0].mediaType }
  }
  return null
}

/**
 * Attempts a confident TMDB id match by title (+ year when known).
 * Returns 'matched' / 'unmatched' / 'error' — the caller persists the outcome
 * (or queues the movie for user review on 'unmatched').
 */
export async function autoMatchTmdbId(movie: Movie): Promise<TmdbAutoMatch> {
  try {
    const results = await searchMovies(movie.title)
    const match = pickMatch(results, movie)
    return match != null
      ? { kind: 'matched', tmdbId: match.id, mediaType: match.mediaType }
      : { kind: 'unmatched' }
  } catch {
    return { kind: 'error' }
  }
}
