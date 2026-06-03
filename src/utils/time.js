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

/** Current ISO timestamp (UTC instant) — for createdAt-style fields. */
export function nowISO() {
  return new Date().toISOString()
}
