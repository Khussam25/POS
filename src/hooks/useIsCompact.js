import { useState, useEffect } from 'react'
import { useIsMobile } from './useIsMobile'

/** Tablets and phones — stacked POS / Settings layouts. */
export const COMPACT_BREAKPOINT = 1104

const PHONE_MAX = 768

export function useIsCompact() {
  return useIsMobile(COMPACT_BREAKPOINT)
}

export function useIsPhone() {
  return useIsMobile(PHONE_MAX)
}

/** Tablet only (768px – 1103px): sidebar toggle, no bottom nav bar. */
export function useIsTablet() {
  const query = `(min-width: ${PHONE_MAX}px) and (max-width: ${COMPACT_BREAKPOINT - 1}px)`
  const [isTablet, setIsTablet] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = e => setIsTablet(e.matches)
    setIsTablet(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return isTablet
}
