import { useEffect, useRef, useState } from 'react'
import { TmdbWatchProvider, TmdbWatchProviders } from '../types'
import { getWatchProviders } from '../services/tmdbService'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { recordError } from '../services/logger'

interface Props {
  tmdbId: number
  mediaType: string
  onClose: () => void
}

export function WhereToWatchDialog({ tmdbId, mediaType, onClose }: Props) {
  const [providers, setProviders] = useState<TmdbWatchProviders | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logoFailed, setLogoFailed] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const type = mediaType === 'tv' ? 'tv' : 'movie'
    getWatchProviders(tmdbId, type, 'US')
      .then((p) => setProviders(p))
      .catch((err) => {
        recordError(err, 'getWatchProviders')
        setError("Couldn't load providers.")
      })
      .finally(() => setLoading(false))
  }, [tmdbId, mediaType])

  const isEmpty = providers != null && providers.flatrate.length === 0 && providers.buy.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="where-to-watch-title"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="where-to-watch-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            Where to Watch
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">Loading providers…</p>
          )}
          {error && !loading && (
            <p className="text-sm text-red-600 dark:text-red-400 py-4">{error}</p>
          )}
          {!loading && !error && isEmpty && (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
              TMDB has no streaming or purchase listings for this title in the US.
            </p>
          )}
          {!loading && !error && providers && !isEmpty && (
            <div className="space-y-5">
              {providers.flatrate.length > 0 && (
                <ProviderSection title="Stream" providers={providers.flatrate} />
              )}
              {providers.buy.length > 0 && (
                <ProviderSection title="Buy" providers={providers.buy} />
              )}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <a
                  href="https://www.justwatch.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:underline"
                >
                  Streaming data provided by
                  {logoFailed ? (
                    <span className="text-blue-600 dark:text-blue-400">JustWatch</span>
                  ) : (
                    <img
                      src="https://www.justwatch.com/appassets/img/logo/JustWatch-logo-large.webp"
                      alt="JustWatch"
                      className="h-5"
                      onError={() => setLogoFailed(true)}
                    />
                  )}
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          {providers?.link && (
            <a
              href={providers.link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
            >
              Open on TMDB
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function ProviderSection({ title, providers }: { title: string; providers: TmdbWatchProvider[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
        {title}
      </h3>
      <ul className="space-y-2">
        {providers.map((p) => (
          <li key={p.providerId} className="flex items-center gap-3">
            {p.logoPath ? (
              <img
                src={`https://image.tmdb.org/t/p/w92${p.logoPath}`}
                alt=""
                className="w-9 h-9 rounded object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded bg-gray-200 dark:bg-gray-700" />
            )}
            <span className="text-sm text-gray-900 dark:text-white">{p.providerName}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
