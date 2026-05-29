import { useState, useEffect } from 'react'

/** Tablets and phones — stacked POS / Settings layouts. */
export const COMPACT_BREAKPOINT = 1104

const PHONE_MAX = 768
/** iPad landscape can exceed COMPACT_BREAKPOINT; only treat as tablet when touch-primary. */
const TOUCH_TABLET_MAX = 1366

function isTouchPrimaryDevice() {
  if (typeof window === 'undefined') return false
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  return coarse && !fine
}

function detectLayoutMode() {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w < PHONE_MAX) return 'phone'
  if (w < COMPACT_BREAKPOINT) return 'tablet'
  if (isTouchPrimaryDevice() && w < TOUCH_TABLET_MAX) return 'tablet'
  return 'desktop'
}

export function useLayoutMode() {
  const [mode, setMode] = useState(detectLayoutMode)

  useEffect(() => {
    const update = () => setMode(detectLayoutMode())
    window.addEventListener('resize', update)
    const coarseMq = window.matchMedia('(pointer: coarse)')
    const fineMq = window.matchMedia('(hover: hover) and (pointer: fine)')
    coarseMq.addEventListener('change', update)
    fineMq.addEventListener('change', update)
    return () => {
      window.removeEventListener('resize', update)
      coarseMq.removeEventListener('change', update)
      fineMq.removeEventListener('change', update)
    }
  }, [])

  return mode
}

export function useIsCompact() {
  const mode = useLayoutMode()
  return mode === 'phone' || mode === 'tablet'
}

export function useIsPhone() {
  return useLayoutMode() === 'phone'
}

/** Tablet: 768px–1103px, or touch-primary device up to 1366px (e.g. iPad landscape). */
export function useIsTablet() {
  return useLayoutMode() === 'tablet'
}
