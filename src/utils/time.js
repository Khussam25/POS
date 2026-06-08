// All sale/payment timestamps use Tanzania time (EAT, UTC+3, no DST) so they
// are consistent regardless of the device or cashier's local timezone.
const TZ = 'Africa/Dar_es_Salaam'

// en-CA formats the date as YYYY-MM-DD; h23 keeps the hour in 00–23.
const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** Current date in Tanzania, 'YYYY-MM-DD'. */
export function todayTZ(d = new Date()) {
  return dateFmt.format(d)
}

/** Current time in Tanzania, 'HH:MM' (24h). */
export function nowTimeTZ(d = new Date()) {
  return timeFmt.format(d)
}

/** Current { date, time } in Tanzania time. */
export function nowTZParts(d = new Date()) {
  return { date: todayTZ(d), time: nowTimeTZ(d) }
}

/** Current hour in Tanzania (0–23). */
export function hourTZ(d = new Date()) {
  try {
    const hour = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' })
      .formatToParts(d)
      .find(p => p.type === 'hour')?.value
    return parseInt(hour ?? '0', 10)
  } catch {
    return d.getHours()
  }
}

/** Long date label in Tanzania time, e.g. "Monday, June 8, 2026". */
export function dateLabelTZ(d = new Date(), locale = 'en-US') {
  const opts = {
    timeZone: TZ,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  try {
    return new Intl.DateTimeFormat(locale, opts).format(d)
  } catch {
    return new Intl.DateTimeFormat('en-US', opts).format(d)
  }
}

/** Month and year label in Tanzania time, e.g. "May 2026". */
export function monthYearLabelTZ(d = new Date(), locale = 'en-US') {
  const opts = { timeZone: TZ, month: 'long', year: 'numeric' }
  try {
    return new Intl.DateTimeFormat(locale, opts).format(d)
  } catch {
    return new Intl.DateTimeFormat('en-US', opts).format(d)
  }
}

/** Greeting key period from Tanzania hour: morning | afternoon | evening */
export function greetingPeriodTZ(d = new Date()) {
  const hour = hourTZ(d)
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

/** Current ISO timestamp (UTC instant) — for createdAt-style fields. */
export function nowISO() {
  return new Date().toISOString()
}
