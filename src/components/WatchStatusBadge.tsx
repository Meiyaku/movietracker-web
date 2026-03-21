import { WatchStatus } from '../types'

interface WatchStatusBadgeProps {
  status: WatchStatus
}

export function WatchStatusBadge({ status }: WatchStatusBadgeProps) {
  const isWatched = status === WatchStatus.WATCHED

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${
        isWatched
          ? 'bg-watched-fill border-watched-border text-green-900'
          : 'bg-want-fill border-want-border text-white'
      }`}
    >
      {isWatched ? 'Watched' : 'Want to Watch'}
    </span>
  )
}
