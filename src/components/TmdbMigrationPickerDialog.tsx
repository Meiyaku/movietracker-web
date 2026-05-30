import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Movie, TmdbSearchResult } from '../types'
import { searchMovies, getThumbnailUrl } from '../services/tmdbService'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { recordError } from '../services/logger'

interface Props {
  movie: Movie
  onPick: (tmdbId: number, mediaType: string) => void
  onSkip: () => void
}

export function TmdbMigrationPickerDialog({ movie, onPick, onSkip }: Props) {
  const [query, setQuery] = useState(movie.title)
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)

  async function performSearch(q: string) {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    setResults([])
    try {
      const res = await searchMovies(q.trim())
      setResults(res)
      if (res.length === 0) setError('No results found.')
    } catch (e) {
      setError('Search failed. Check your network connection.')
      recordError(e, 'migrationPicker:search')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    performSearch(movie.title)
    inputRef.current?.focus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie.id])

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') performSearch(query)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="migration-picker-title"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            No match found for
          </p>
          <h2 id="migration-picker-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            {movie.title}
            {movie.year && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                ({movie.year})
              </span>
            )}
          </h2>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search TMDB…"
              aria-label="Search TMDB"
            />
            <button
              type="button"
              onClick={() => performSearch(query)}
              disabled={loading || !query.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              Search
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Searching…</div>
          )}
          {error && !loading && (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">{error}</div>
          )}
          {!loading && !error && (
            <ul>
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onPick(r.id, r.mediaType)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors"
                  >
                    {r.posterPath ? (
                      <img
                        src={getThumbnailUrl(r.posterPath)}
                        alt=""
                        className="w-12 h-[72px] object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-[72px] bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {r.title ?? r.name}
                        </p>
                        {(r.releaseDate ?? r.firstAirDate)?.slice(0, 4) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                            {(r.releaseDate ?? r.firstAirDate)?.slice(0, 4)}
                          </p>
                        )}
                      </div>
                      {r.overview && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                          {r.overview}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
