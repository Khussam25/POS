/** Strip to digits only. */
export function phoneDigits(value) {
  return String(value ?? '').replace(/\D/g, '')
}

function joinGroups(prefix, groups) {
  const parts = groups.filter(Boolean)
  return parts.length ? `${prefix} ${parts.join(' ')}` : prefix
}

/** Tanzania: +255 XXX XXX XXX */
function formatTzNational(national) {
  const n = national.slice(0, 9)
  const groups = [n.slice(0, 3), n.slice(3, 6), n.slice(6, 9)].filter(g => g.length > 0)
  return joinGroups('+255', groups)
}

/** US/Canada: +1 XXX XXX XXXX */
function formatUsNational(national) {
  const n = national.slice(0, 10)
  const groups = [n.slice(0, 3), n.slice(3, 6), n.slice(6, 10)].filter(g => g.length > 0)
  return joinGroups('+1', groups)
}

/**
 * Format phone for display and while typing (spaces after country code).
 */
export function formatPhoneInput(value) {
  const raw = String(value ?? '')
  const digits = phoneDigits(raw)
  if (!digits) return raw.trimStart().startsWith('+') ? '+' : ''

  // Tanzania (+255 or local 0… / 7… mobile)
  if (digits.startsWith('255')) {
    return formatTzNational(digits.slice(3))
  }
  if (digits.startsWith('0')) {
    return formatTzNational(digits.slice(1))
  }
  if (digits.length <= 9 && /^[67]/.test(digits)) {
    return formatTzNational(digits)
  }

  // North America (+1…)
  if (digits.startsWith('1')) {
    return formatUsNational(digits.slice(1))
  }

  // Other international: + then groups of 3
  if (digits.length <= 3) return `+${digits}`
  const head = digits.slice(0, Math.min(3, digits.length > 6 ? 3 : 2))
  const rest = digits.slice(head.length)
  const tailGroups = []
  for (let i = 0; i < rest.length; i += 3) {
    tailGroups.push(rest.slice(i, i + 3))
  }
  return joinGroups(`+${head}`, tailGroups)
}

/** Format stored value for read-only display. */
export function formatPhoneDisplay(value) {
  if (!value) return ''
  return formatPhoneInput(value)
}
