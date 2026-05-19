import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { TmdbSearchResult } from '../types'
import { searchMovies, getTrailerUrl, getThumbnailUrl, getPosterUrl } from '../services/tmdbService'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { recordError } from '../services/logger'

interface TmdbSearchDialogProps {
  onSelect: (data: {
    title: string
    year: string
    posterUrl: string
    trailerUrl: string
    description: string
    genre: string
  }) => void
  onClose: () => void
  initialQuery?: string
}

export function TmdbSearchDialog({ onSelect, onClose, initialQuery = '' }: TmdbSearchDialogProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectingId, setSelectingId] = useState<number | null>(null)
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
      recordError(e, 'tmdbSearch')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch() { performSearch(query) }

  useEffect(() => {
    if (initialQuery.trim()) performSearch(initialQuery.trim())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch()
  }

  async function handleSelect(result: TmdbSearchResult) {
    setSelectingId(result.id)
    const displayTitle = result.title ?? result.name ?? ''
    const dateStr = result.releaseDate ?? result.firstAirDate
    const year = dateStr ? dateStr.substring(0, 4) : ''
    const posterUrl = result.posterPath ? getPosterUrl(result.posterPath) : ''
    const genre = result.genre ?? ''
    try {
      const trailerUrl = await getTrailerUrl(result.id, result.mediaType)
      onSelect({ title: displayTitle, year, posterUrl, trailerUrl: trailerUrl ?? '', description: result.overview ?? '', genre })
    } catch (e) {
      recordError(e, 'fetchTrailer')
      onSelect({ title: displayTitle, year, posterUrl, trailerUrl: '', description: result.overview ?? '', genre })
    } finally {
      setSelectingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tmdb-search-title"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="tmdb-search-title" className="text-lg font-bold text-gray-900 dark:text-white">Search TMDB</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search for a movie..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            autoFocus
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">{error}</p>
          )}
          {results.map((result) => {
            const displayTitle = result.title ?? result.name
            const dateStr = result.releaseDate ?? result.firstAirDate
            const year = dateStr ? dateStr.substring(0, 4) : null
            return (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                disabled={selectingId != null}
                className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-10 h-14 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {result.posterPath ? (
                    <img
                      src={getThumbnailUrl(result.posterPath)}
                      alt={displayTitle ?? ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">
                    {displayTitle}
                    {selectingId === result.id && (
                      <span className="ml-2 text-xs text-blue-500">Loading…</span>
                    )}
                  </p>
                  {(year || (result.voteAverage != null && result.voteAverage > 0)) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {year}
                      {year && result.voteAverage != null && result.voteAverage > 0 && ' · '}
                      {result.voteAverage != null && result.voteAverage > 0 && `★ ${result.voteAverage.toFixed(1)}`}
                    </p>
                  )}
                  {result.overview && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {result.overview}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
