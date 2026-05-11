import { useState } from 'react'
import type { MouseEvent } from 'react'

const STAR_PATH =
  'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'

interface StarRatingPickerProps {
  value: number | null
  onChange: (rating: number) => void
  max?: number
}

function getStarValue(e: MouseEvent<HTMLButtonElement>, index: number): number {
  const rect = e.currentTarget.getBoundingClientRect()
  return e.clientX - rect.left < rect.width / 2 ? index + 0.5 : index + 1
}

export function StarRatingPicker({ value, onChange, max = 5 }: StarRatingPickerProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? value ?? 0

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1
        const fill = Math.min(1, Math.max(0, display - i))
        return (
          <button
            key={i}
            type="button"
            onClick={(e) => onChange(getStarValue(e, i))}
            onMouseEnter={(e) => setHovered(getStarValue(e, i))}
            onMouseMove={(e) => setHovered(getStarValue(e, i))}
            onMouseLeave={() => setHovered(null)}
            className="relative w-7 h-7 focus:outline-none transition-transform hover:scale-110"
            aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
          >
            <svg aria-hidden="true" className="w-7 h-7 text-gray-300 dark:text-gray-600 absolute inset-0" fill="currentColor" viewBox="0 0 20 20">
              <path d={STAR_PATH} />
            </svg>
            {fill > 0 && (
              <svg
                aria-hidden="true"
                className="w-7 h-7 text-star absolute inset-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                style={fill < 1 ? { clipPath: 'inset(0 50% 0 0)' } : undefined}
              >
                <path d={STAR_PATH} />
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
}
