export function SkeletonMovieCard() {
  return (
    <div className="w-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse">
      <div className="w-full aspect-[2/3] bg-gray-200 dark:bg-gray-700" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/5" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mt-1" />
      </div>
    </div>
  )
}
