import { useIsMobile } from './useIsMobile'

/** Phones and tablets — use drawer nav, stacked pages, POS tabs. */
export const COMPACT_BREAKPOINT = 1104

export function useIsCompact() {
  return useIsMobile(COMPACT_BREAKPOINT)
}
