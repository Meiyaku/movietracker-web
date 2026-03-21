import { TmdbSearchResult } from '../types'

const BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN as string
const BASE_URL = 'https://api.themoviedb.org/3'

const headers = {
  Authorization: `Bearer ${BEARER_TOKEN}`,
  'Content-Type': 'application/json',
}

interface TmdbMovieDto {
  id: number
  title?: string
  original_title?: string
  overview?: string
  release_date?: string
  poster_path?: string
}

interface TmdbVideoDto {
  key: string
  site: string
  type: string
  official: boolean
}

interface TmdbSearchResponse {
  results: TmdbMovieDto[]
}

interface TmdbVideosResponse {
  results: TmdbVideoDto[]
}

export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  const url = `${BASE_URL}/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`)
  const data: TmdbSearchResponse = await res.json()
  return data.results.map((dto) => ({
    id: dto.id,
    title: dto.title ?? dto.original_title ?? '',
    releaseDate: dto.release_date ?? null,
    overview: dto.overview ?? null,
    posterPath: dto.poster_path ?? null,
  }))
}

export async function getTrailerUrl(movieId: number): Promise<string | null> {
  const url = `${BASE_URL}/movie/${movieId}/videos`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`TMDB videos failed: ${res.status}`)
  const data: TmdbVideosResponse = await res.json()
  const trailers = data.results.filter((v) => v.site === 'YouTube' && v.type === 'Trailer')
  const video = trailers.find((v) => v.official) ?? trailers[0] ?? null
  return video ? `https://www.youtube.com/watch?v=${video.key}` : null
}

export function getThumbnailUrl(posterPath: string): string {
  return `https://image.tmdb.org/t/p/w92${posterPath}`
}

export function getPosterUrl(posterPath: string): string {
  return `https://image.tmdb.org/t/p/w500${posterPath}`
}
