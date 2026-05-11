import { useNavigate } from 'react-router-dom'
import { Movie, WatchStatus } from '../types'
import { WatchStatusBadge } from './WatchStatusBadge'
import { StarRating } from './StarRating'

interface MovieCardProps {
  movie: Movie
}

export function MovieCard({ movie }: MovieCardProps) {
  const navigate = useNavigate()

  const isWatched = movie.status === WatchStatus.WATCHED
  const statusLabel = isWatched ? 'Watched' : 'Want to Watch'
  const ratingLabel =
    isWatched && movie.rating != null && movie.rating > 0
      ? `, ${movie.rating} out of 5 stars`
      : ''
  const ariaLabel =
    [movie.title, movie.year, movie.genre].filter(Boolean).join(', ') +
    `, ${statusLabel}` +
    ratingLabel

  const meta = [movie.year, movie.genre?.trim() || null].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="w-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-shadow text-left"
      onClick={() => navigate(`/movies/${movie.id}`)}
    >
      {/* Poster */}
      <div className="w-full aspect-[2/3] bg-gray-200 dark:bg-gray-700" aria-hidden="true">
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5" aria-hidden="true">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight line-clamp-2">
          {movie.title}
        </h3>
        {meta && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{meta}</p>
        )}
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <WatchStatusBadge status={movie.status} />
          {movie.rating != null && <StarRating rating={movie.rating} />}
        </div>
      </div>
    </button>
  )
}
