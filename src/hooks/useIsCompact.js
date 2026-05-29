import { useState, useEffect } from 'react'

const PHONE_MAX = 768
const NARROW_MAX = 1280

function detectLayoutMode() {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  const touch = window.matchMedia('(pointer: coarse)').matches
  if (w < PHONE_MAX) return 'phone'
  // iPads and tablets often report >1104px wide; touch detection catches them
  if (w < NARROW_MAX || touch) return 'tablet'
  return 'desktop'
}

export function useLayoutMode() {
  const [mode, setMode] = useState(detectLayoutMode)

  useEffect(() => {
    const update = () => setMode(detectLayoutMode())
    window.addEventListener('resize', update)
    const touchMq = window.matchMedia('(pointer: coarse)')
    touchMq.addEventListener('change', update)
    return () => {
      window.removeEventListener('resize', update)
      touchMq.removeEventListener('change', update)
    }
  }, [])

  return mode
}

export function useIsPhone() {
  return useLayoutMode() === 'phone'
}

export function useIsTablet() {
  return useLayoutMode() === 'tablet'
}

/** Phone or tablet — stacked POS, drawer/tablet sidebar. */
export function useIsCompact() {
  const mode = useLayoutMode()
  return mode === 'phone' || mode === 'tablet'
}
