const STAR_PATH =
  'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'

interface StarRatingProps {
  rating: number | null
  max?: number
}

export function StarRating({ rating, max = 5 }: StarRatingProps) {
  if (rating == null) return null

  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating} out of ${max} stars`} role="img">
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.min(1, Math.max(0, rating - i))
        const testId = fill >= 1 ? 'star-full' : fill > 0 ? 'star-half' : 'star-empty'
        return (
          <span key={i} data-testid={testId} className="relative inline-block w-4 h-4">
            <svg aria-hidden="true" className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path d={STAR_PATH} />
            </svg>
            {fill > 0 && (
              <svg
                aria-hidden="true"
                className="w-4 h-4 text-star absolute inset-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                style={fill < 1 ? { clipPath: 'inset(0 50% 0 0)' } : undefined}
              >
                <path d={STAR_PATH} />
              </svg>
            )}
          </span>
        )
      })}
    </div>
  )
}
