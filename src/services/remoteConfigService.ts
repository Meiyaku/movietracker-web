import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config'
import { app } from '../firebase'
import { recordError } from './logger'


const PAGE_SIZE_DEFAULT = 25
const PAGE_SIZE_MIN = 10
const PAGE_SIZE_MAX = 100

const remoteConfig = getRemoteConfig(app)
remoteConfig.defaultConfig = {
  tmdb_search_enabled: true,
  page_size: PAGE_SIZE_DEFAULT,
  tmdb_api_key: '',
  max_retry_attempts: 3,
  whats_new: '',
  whats_new_version: 0,
}
remoteConfig.settings.minimumFetchIntervalMillis =
  import.meta.env.DEV ? 0 : 3_600_000

let fetchPromise: Promise<void> | null = null

export function fetchRemoteConfig(): Promise<void> {
  if (!fetchPromise) {
    fetchPromise = fetchAndActivate(remoteConfig)
      .then(() => {})
      .catch((e) => recordError(e, 'fetchRemoteConfig'))
  }
  return fetchPromise
}

export function isTmdbSearchEnabled(): boolean {
  return getValue(remoteConfig, 'tmdb_search_enabled').asBoolean()
}

export function pageSize(): number {
  const val = getValue(remoteConfig, 'page_size').asNumber()
  if (!val || val <= 0) return PAGE_SIZE_DEFAULT
  return Math.min(Math.max(val, PAGE_SIZE_MIN), PAGE_SIZE_MAX)
}

export function tmdbApiKey(): string {
  return getValue(remoteConfig, 'tmdb_api_key').asString()
}

export function maxRetryAttempts(): number {
  const val = getValue(remoteConfig, 'max_retry_attempts').asNumber()
  return Math.max(1, Math.min(10, val || 3))
}

export function whatsNew(): string {
  return getValue(remoteConfig, 'whats_new').asString()
}

export function whatsNewVersion(): number {
  return getValue(remoteConfig, 'whats_new_version').asNumber()
}
