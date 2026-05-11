import { Timestamp } from 'firebase/firestore'

export enum WatchStatus {
  WANT_TO_WATCH = 'WANT_TO_WATCH',
  WATCHED = 'WATCHED',
}

export enum SortOrder {
  TITLE_ASC = 'TITLE_ASC',
  TITLE_DESC = 'TITLE_DESC',
  YEAR_ASC = 'YEAR_ASC',
  YEAR_DESC = 'YEAR_DESC',
  RATING_ASC = 'RATING_ASC',
  RATING_DESC = 'RATING_DESC',
  GENRE_ASC = 'GENRE_ASC',
  GENRE_DESC = 'GENRE_DESC',
  CREATED_ASC = 'CREATED_ASC',
  CREATED_DESC = 'CREATED_DESC',
}

export enum WatchFilter {
  ALL = 'ALL',
  WATCHED = 'WATCHED',
  WANT_TO_WATCH = 'WANT_TO_WATCH',
}

export enum ThemeMode {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM',
}

export interface Movie {
  id: string
  title: string
  year: string
  genre: string
  status: WatchStatus
  rating: number | null
  description: string
  notes: string
  trailerUrl: string
  posterUrl: string
  listIds: string[]
  createdAt: Timestamp
}

export interface MovieList {
  id: string
  name: string
  subtitle?: string
  description?: string
  createdAt: Timestamp
}

export interface TmdbSearchResult {
  id: number
  mediaType: 'movie' | 'tv'
  title: string | null
  name: string | null
  releaseDate: string | null
  firstAirDate: string | null
  overview: string | null
  posterPath: string | null
  voteAverage: number | null
  genre: string | null
}

export const MY_MOVIES_LIST_NAME = 'All Movies'
export const MAX_LIST_SUBTITLE_LENGTH = 30
