import { useNavigate } from 'react-router-dom'
import { Movie } from '../types'
import { WatchStatusBadge } from './WatchStatusBadge'
import { StarRating } from './StarRating'

interface MovieCardProps {
  movie: Movie
}

export function MovieCard({ movie }: MovieCardProps) {
  const navigate = useNavigate()

  return (
    <div
      className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/movies/${movie.id}`)}
    >
      {/* Poster */}
      <div className="flex-shrink-0 w-14 h-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate">
          {movie.title}
        </h3>
        {movie.year && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{movie.year}</p>
        )}
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <WatchStatusBadge status={movie.status} />
          {movie.rating != null && <StarRating rating={movie.rating} />}
        </div>
      </div>

      {/* Chevron */}
      <div className="flex-shrink-0 self-center text-gray-400 dark:text-gray-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}
