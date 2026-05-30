import { TmdbSearchResult, TmdbWatchProviders } from '../types'
import { tmdbApiKey } from './remoteConfigService'

const BEARER_TOKEN_FALLBACK = import.meta.env.VITE_TMDB_BEARER_TOKEN as string
const BASE_URL = 'https://api.themoviedb.org/3'
const TIMEOUT_MS = 10_000

function getHeaders(): Record<string, string> {
  const token = tmdbApiKey() || BEARER_TOKEN_FALLBACK
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { headers: getHeaders(), signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

const TMDB_GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News',
  10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Talk', 10768: 'War & Politics',
}

interface TmdbMultiDto {
  id: number
  media_type: string
  title?: string
  name?: string
  overview?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string
  vote_average?: number
  genre_ids?: number[]
}

interface TmdbVideoDto {
  key: string
  site: string
  type: string
  official: boolean
}

interface TmdbSearchResponse {
  results: TmdbMultiDto[]
}

interface TmdbVideosResponse {
  results: TmdbVideoDto[]
}

export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  const url = `${BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`
  const res = await fetchWithTimeout(url)
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`)
  const data: TmdbSearchResponse = await res.json()
  return data.results
    .filter((dto) => dto.media_type === 'movie' || dto.media_type === 'tv')
    .map((dto) => {
      const genreNames = (dto.genre_ids ?? []).map((id) => TMDB_GENRES[id]).filter(Boolean)
      return {
        id: dto.id,
        mediaType: dto.media_type as 'movie' | 'tv',
        title: dto.title ?? null,
        name: dto.name ?? null,
        releaseDate: dto.release_date ?? null,
        firstAirDate: dto.first_air_date ?? null,
        overview: dto.overview ?? null,
        posterPath: dto.poster_path ?? null,
        voteAverage: dto.vote_average ?? null,
        genre: genreNames.length > 0 ? genreNames.join(' / ') : null,
      }
    })
}

export async function getTrailerUrl(movieId: number, mediaType: 'movie' | 'tv' = 'movie'): Promise<string | null> {
  const url = `${BASE_URL}/${mediaType}/${movieId}/videos`
  const res = await fetchWithTimeout(url)
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

interface TmdbProviderDto {
  provider_id: number
  provider_name: string
  logo_path?: string | null
}

interface TmdbWatchProvidersResponse {
  results: Record<string, {
    link?: string
    flatrate?: TmdbProviderDto[]
    buy?: TmdbProviderDto[]
  }>
}

/**
 * Probes `/movie/{id}` and `/tv/{id}` and returns the one whose title/name matches
 * `expectedTitle` (case-insensitive). TMDB ids are per-namespace, so the same numeric id
 * can exist as both a movie and a TV show — title disambiguation is required.
 * Returns null when neither endpoint exists.
 */
export async function lookupMediaType(id: number, expectedTitle: string): Promise<string | null> {
  async function fetchTitle(path: 'movie' | 'tv', key: 'title' | 'name'): Promise<string | null> {
    const res = await fetchWithTimeout(`${BASE_URL}/${path}/${id}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`TMDB ${path} lookup failed: ${res.status}`)
    const data = (await res.json()) as Record<string, unknown>
    const value = data[key]
    return typeof value === 'string' ? value : null
  }
  const [movieTitle, tvName] = await Promise.all([
    fetchTitle('movie', 'title'),
    fetchTitle('tv', 'name'),
  ])
  const expected = expectedTitle.toLowerCase()
  if (movieTitle && movieTitle.toLowerCase() === expected) return 'movie'
  if (tvName && tvName.toLowerCase() === expected) return 'tv'
  // Only one resolved: trust that endpoint.
  if (movieTitle != null && tvName == null) return 'movie'
  if (tvName != null && movieTitle == null) return 'tv'
  return null
}

export async function getWatchProviders(
  id: number,
  mediaType: 'movie' | 'tv',
  region: string = 'US'
): Promise<TmdbWatchProviders> {
  const url = `${BASE_URL}/${mediaType}/${id}/watch/providers`
  const res = await fetchWithTimeout(url)
  if (!res.ok) throw new Error(`TMDB watch providers failed: ${res.status}`)
  const data: TmdbWatchProvidersResponse = await res.json()
  const regionData = data.results[region]
  if (!regionData) return { link: null, flatrate: [], buy: [] }
  const mapProvider = (p: TmdbProviderDto) => ({
    providerId: p.provider_id,
    providerName: p.provider_name,
    logoPath: p.logo_path ?? null,
  })
  return {
    link: regionData.link ?? null,
    flatrate: (regionData.flatrate ?? []).map(mapProvider),
    buy: (regionData.buy ?? []).map(mapProvider),
  }
}
