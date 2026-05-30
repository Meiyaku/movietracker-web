import { useState } from 'react'
import { Movie, WatchStatus } from '../types'
import { WatchStatusBadge } from './WatchStatusBadge'
import { StarRating } from './StarRating'
import { WhereToWatchDialog } from './WhereToWatchDialog'

interface Props {
  movie: Movie
  onRedetectMediaType?: () => void
  isRedetectingMediaType?: boolean
  redetectMediaTypeError?: string | null
}

export function MovieDetailView({
  movie,
  onRedetectMediaType,
  isRedetectingMediaType,
  redetectMediaTypeError,
}: Props) {
  const [showWhereToWatch, setShowWhereToWatch] = useState(false)
  const googleFallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `where to watch ${movie.title}${movie.year ? ` ${movie.year}` : ''}`
  )}`

  return (
    <div className="space-y-4">
      <div className="w-full max-w-[200px] mx-auto rounded-2xl overflow-hidden shadow-lg bg-gray-200 dark:bg-gray-700 aspect-[2/3]">
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{movie.title}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <WatchStatusBadge status={movie.status} />
            {movie.status === WatchStatus.WATCHED && movie.rating != null && (
              <StarRating rating={movie.rating} />
            )}
          </div>
        </div>

        {(movie.year || movie.genre) && (
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
            {movie.year && (
              <p>
                <span className="font-medium text-gray-700 dark:text-gray-300">Year:</span>{' '}
                {movie.year}
              </p>
            )}
            {movie.genre && (
              <p>
                <span className="font-medium text-gray-700 dark:text-gray-300">Genre:</span>{' '}
                {movie.genre}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(() => {
            const className =
              'flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors'
            const content = (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v5zM8 18h8" />
                </svg>
                Where to Watch
              </>
            )
            return movie.tmdbId != null ? (
              <button type="button" onClick={() => setShowWhereToWatch(true)} className={className}>
                {content}
              </button>
            ) : (
              <a href={googleFallbackUrl} target="_blank" rel="noopener noreferrer" className={className}>
                {content}
              </a>
            )
          })()}
          {typeof navigator.share === 'function' && (
            <button
              type="button"
              onClick={() => navigator.share({ title: movie.title, url: window.location.href }).catch(() => {})}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors"
              aria-label="Share movie"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          )}
        </div>

        {movie.notes && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Notes
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {movie.notes}
            </p>
          </div>
        )}

        {movie.description && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Description
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {movie.description}
            </p>
          </div>
        )}

        {movie.trailerUrl && (
          <a
            href={movie.trailerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            Watch Trailer
          </a>
        )}

        {movie.tmdbId != null && onRedetectMediaType && (
          <>
            <hr className="border-gray-200 dark:border-gray-700" />
            <div className="space-y-1">
              <button
                type="button"
                onClick={onRedetectMediaType}
                disabled={isRedetectingMediaType}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50 transition-colors"
              >
                {isRedetectingMediaType
                  ? 'Re-detecting…'
                  : movie.tmdbMediaType
                    ? `Re-detect media type (currently ${movie.tmdbMediaType})`
                    : 'Detect media type'}
              </button>
              {redetectMediaTypeError && (
                <p className="text-xs text-red-600 dark:text-red-400">{redetectMediaTypeError}</p>
              )}
            </div>
          </>
        )}
      </div>

      {showWhereToWatch && movie.tmdbId != null && (
        <WhereToWatchDialog
          tmdbId={movie.tmdbId}
          mediaType={movie.tmdbMediaType ?? 'movie'}
          onClose={() => setShowWhereToWatch(false)}
        />
      )}
    </div>
  )
}
