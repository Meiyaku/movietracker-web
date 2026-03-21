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
  createdAt: Timestamp
}

export interface TmdbSearchResult {
  id: number
  title: string
  releaseDate: string | null
  overview: string | null
  posterPath: string | null
}

export const MY_MOVIES_LIST_NAME = 'My Movies'
