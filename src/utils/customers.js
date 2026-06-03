// Customer ledger helpers — codes, balances, and credit/repayment logic.
// A sale's amountPaid tracks how much has been settled so far (at checkout +
// later repayments). Outstanding balance = total - amountPaid.
// Legacy sales with no amountPaid are treated as fully paid.

import { roundTz } from './money'

/** Amount already settled on a sale. Legacy sales (no field) count as paid. */
export function salePaid(sale) {
  if (sale.amountPaid == null) return sale.total || 0
  return Math.max(0, roundTz(sale.amountPaid))
}

/** Outstanding balance still owed on a sale. */
export function saleBalance(sale) {
  return Math.max(0, roundTz((sale.total || 0) - salePaid(sale)))
}

/** 'Paid' | 'Partial' | 'Unpaid' for a single sale. */
export function salePaymentStatus(sale) {
  const bal = saleBalance(sale)
  if (bal <= 0) return 'Paid'
  return salePaid(sale) > 0 ? 'Partial' : 'Unpaid'
}

/** Next sequential customer code, e.g. JB-0001. Scans existing codes. */
export function nextCustomerCode(customers) {
  let max = 0
  for (const c of customers) {
    const m = /^JB-(\d+)$/.exec(c.code || '')
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return 'JB-' + String(max + 1).padStart(4, '0')
}

export function genCustomerId() {
  return 'cust_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/** Build a new customer record with an auto code. */
export function makeCustomer({ name, phone = '', note = '' }, customers) {
  return {
    id: genCustomerId(),
    code: nextCustomerCode(customers),
    name: name.trim(),
    phone: phone.trim(),
    note: note.trim(),
    createdAt: new Date().toISOString(),
  }
}

/** Sales on a given date not yet attached to any customer (newest first). */
export function unlinkedSalesOnDate(sales, date) {
  return sales
    .filter(s => s.date === date && !s.customerId)
    .sort((a, b) => (b.time || '').localeCompare(a.time || ''))
}

/** Attach a set of existing sales to a customer (sets customerId + name). */
export function linkSalesToCustomer(sales, saleIds, customer) {
  const ids = new Set(saleIds)
  return sales.map(s => ids.has(s.id) ? { ...s, customerId: customer.id, customer: customer.name } : s)
}

/**
 * Resolve a typed customer name to a customer id for a sale: matches an
 * existing customer, creates one for a new name, or returns null for an
 * empty / walk-in name. Returns the (possibly extended) customers list.
 */
export function ensureCustomerForName(customers, name, phone = '') {
  const trimmed = (name || '').trim()
  if (!trimmed || trimmed.toLowerCase() === 'walk-in customer') {
    return { customerId: null, customers, created: null }
  }
  const existing = findCustomerByName(customers, trimmed)
  if (existing) return { customerId: existing.id, customers, created: null }
  const created = makeCustomer({ name: trimmed, phone }, customers)
  return { customerId: created.id, customers: [created, ...customers], created }
}

/** Find a customer by exact (case-insensitive) name, else undefined. */
export function findCustomerByName(customers, name) {
  const n = name.trim().toLowerCase()
  if (!n) return undefined
  return customers.find(c => c.name.trim().toLowerCase() === n)
}

/** All sales belonging to a customer (newest first). */
export function customerSales(sales, customerId) {
  return sales
    .filter(s => s.customerId === customerId)
    .sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')))
}

/** Aggregate stats for one customer across their sales. */
export function customerStats(customer, sales) {
  const own = sales.filter(s => s.customerId === customer.id)
  const purchased = own.reduce((a, s) => a + (s.total || 0), 0)
  const paid = own.reduce((a, s) => a + salePaid(s), 0)
  const outstanding = own.reduce((a, s) => a + saleBalance(s), 0)
  const lastDate = own.reduce((d, s) => (s.date > d ? s.date : d), '')
  return {
    purchased: roundTz(purchased),
    paid: roundTz(paid),
    outstanding: roundTz(outstanding),
    txnCount: own.length,
    lastDate,
  }
}

/** Total receivables across all customers + unassigned credit sales. */
export function totalReceivables(sales) {
  return roundTz(sales.reduce((a, s) => a + saleBalance(s), 0))
}

/**
 * Apply a repayment to a customer's outstanding sales, oldest first.
 * Returns the updated sales array. A `payment` record (date/by/amount) is
 * appended to each sale touched, for an audit trail.
 */
export function applyPayment(sales, customerId, amount, by) {
  let remaining = roundTz(amount)
  if (remaining <= 0) return sales
  const date = new Date().toISOString().split('T')[0]

  // Decide how much each sale receives, oldest unpaid first.
  const oldestFirst = sales
    .filter(s => s.customerId === customerId && saleBalance(s) > 0)
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))

  const applied = new Map() // saleId -> amount applied
  for (const s of oldestFirst) {
    if (remaining <= 0) break
    const pay = Math.min(saleBalance(s), remaining)
    applied.set(s.id, pay)
    remaining = roundTz(remaining - pay)
  }

  return sales.map(s => {
    const pay = applied.get(s.id)
    if (!pay) return s
    return {
      ...s,
      amountPaid: roundTz(salePaid(s) + pay),
      payments: [...(s.payments || []), { amount: pay, date, by }],
    }
  })
}
