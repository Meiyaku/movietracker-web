import { useEffect, useRef, useState, RefObject } from 'react'

const THRESHOLD = 64

export function usePullToRefresh(
  scrollRef: RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void>,
) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef(0)
  const pullingRef = useRef(false)
  const refreshingRef = useRef(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop > 0) return
      startYRef.current = e.touches[0].clientY
    }

    function onTouchMove(e: TouchEvent) {
      if (refreshingRef.current) return
      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0 || el!.scrollTop > 0) {
        if (pullingRef.current) {
          pullingRef.current = false
          setPullDistance(0)
        }
        return
      }
      e.preventDefault()
      pullingRef.current = true
      setPullDistance(Math.min(dy * 0.5, THRESHOLD))
    }

    async function onTouchEnd() {
      if (!pullingRef.current) return
      pullingRef.current = false
      if (pullDistance >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true
        setRefreshing(true)
        setPullDistance(0)
        try {
          await onRefresh()
        } finally {
          refreshingRef.current = false
          setRefreshing(false)
        }
      } else {
        setPullDistance(0)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [scrollRef, onRefresh, pullDistance])

  return { pullDistance, refreshing }
}
