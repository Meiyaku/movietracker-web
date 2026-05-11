export function OfflineBanner() {
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-yellow-500 text-yellow-950 text-xs font-medium text-center py-1.5 px-4">
      You're offline — changes won't sync until you reconnect.
    </div>
  )
}
