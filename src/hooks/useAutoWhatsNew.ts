import { useState, useEffect, useCallback } from 'react'
import { fetchRemoteConfig, whatsNew, whatsNewVersion } from '../services/remoteConfigService'

const LAST_SEEN_KEY = 'last_seen_whats_new_version'

/**
 * Auto-pops the "What's New" notes once when the Remote Config version
 * exceeds the version last seen on this device.
 */
export function useAutoWhatsNew() {
  const [autoWhatsNew, setAutoWhatsNew] = useState<{ notes: string } | null>(null)

  useEffect(() => {
    fetchRemoteConfig().then(() => {
      const remote = whatsNewVersion()
      const stored = localStorage.getItem(LAST_SEEN_KEY)
      if (stored == null) {
        localStorage.setItem(LAST_SEEN_KEY, String(remote))
        return
      }
      const lastSeen = Number(stored)
      if (Number.isFinite(lastSeen) && remote > lastSeen) {
        setAutoWhatsNew({ notes: whatsNew() })
        localStorage.setItem(LAST_SEEN_KEY, String(remote))
      }
    })
  }, [])

  const dismissAutoWhatsNew = useCallback(() => setAutoWhatsNew(null), [])

  return { autoWhatsNew, dismissAutoWhatsNew }
}
