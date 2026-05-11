const isDev = import.meta.env.DEV

export function log(message: string): void {
  if (isDev) {
    console.log(`[MovieTracker] ${message}`)
  }
}

export function recordError(error: unknown, context?: string): void {
  const prefix = context ? `[${context}] ` : ''
  if (isDev) {
    console.error(`[MovieTracker] ${prefix}`, error)
  } else {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[MovieTracker] ${prefix}${message}`)
  }
}
