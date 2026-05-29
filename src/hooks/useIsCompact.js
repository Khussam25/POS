import { useState, useEffect, useRef } from 'react'

/** Tablets and phones — stacked POS / Settings layouts. */
export const COMPACT_BREAKPOINT = 1104

const PHONE_MAX = 768
const TOUCH_TABLET_MAX = 1366
const RESIZE_DEBOUNCE_MS = 200

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
  const timerRef = useRef(null)

  useEffect(() => {
    const apply = () => setMode(detectLayoutMode())
    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(apply, RESIZE_DEBOUNCE_MS)
    }

    apply()

    window.addEventListener('resize', schedule)
    const coarseMq = window.matchMedia('(pointer: coarse)')
    const fineMq = window.matchMedia('(hover: hover) and (pointer: fine)')
    coarseMq.addEventListener('change', schedule)
    fineMq.addEventListener('change', schedule)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      window.removeEventListener('resize', schedule)
      coarseMq.removeEventListener('change', schedule)
      fineMq.removeEventListener('change', schedule)
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

export function useIsTablet() {
  return useLayoutMode() === 'tablet'
}
