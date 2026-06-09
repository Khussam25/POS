/** Whole TZS amounts — Tanzania shillings are not fractional. */
export function roundTz(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.round(x)
}

/** Fallback when settings have no rate yet. */
export const DEFAULT_EXCHANGE_RATE = 2650
/** @deprecated use settings.exchangeRate — kept for imports that expect USD_TO_TZS */
export const USD_TO_TZS = DEFAULT_EXCHANGE_RATE
export const NY_SALES_TAX_RATE = 0.08625

export function resolveExchangeRate(exchangeRate) {
  const n = Number(exchangeRate)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_EXCHANGE_RATE
}

/** USD buying price → TZS (NY sales tax, then × settings exchange rate). */
export function buyingUsdToTzs(usd, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  const n = Number(usd)
  if (!Number.isFinite(n) || n <= 0) return 0
  const rate = resolveExchangeRate(exchangeRate)
  return roundTz(n * (1 + NY_SALES_TAX_RATE) * rate)
}

export function buyingTzsToUsd(tzs, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  const n = Number(tzs)
  if (!Number.isFinite(n) || n <= 0) return 0
  const rate = resolveExchangeRate(exchangeRate)
  return n / ((1 + NY_SALES_TAX_RATE) * rate)
}

export function fmtMoney(n) {
  return 'TZS ' + roundTz(n).toLocaleString()
}

/** Merchant sales revenue (excludes VAT pass-through). */
export function saleNetRevenue(sale) {
  if (sale.subtotal != null) {
    return roundTz(sale.subtotal - (sale.discountAmount || 0))
  }
  return roundTz((sale.total || 0) - (sale.vat || 0))
}

/**
 * Unit cost for a sale line.
 * - `locked` (sale.costsLocked): the cost is frozen — use the stored snapshot
 *   verbatim so later price changes never alter a past report.
 * - otherwise: use the stored snapshot when it's a real (> 0) cost, else fall
 *   back to the product's CURRENT buying price. This is what lets COGS self-heal
 *   for older sales whose product had no buying price recorded at the time.
 */
export function itemUnitCost(item, products, locked = false) {
  const stored = Number(item?.buyingPriceTZS)
  if (locked) return Number.isFinite(stored) ? stored : 0
  if (Number.isFinite(stored) && stored > 0) return stored
  const prod = products?.find(p => p.id === item.productId)
  return prod?.buyingPriceTZS ?? 0
}

export function saleCogs(sale, products) {
  const items = Array.isArray(sale.items) ? sale.items : []
  const locked = !!sale.costsLocked
  return roundTz(
    items.reduce((sum, item) => sum + itemUnitCost(item, products, locked) * (item.qty || 0), 0)
  )
}

/**
 * Freeze the cost of each sale: write the currently-resolved unit cost into
 * every line and mark the sale `costsLocked`, so future buying-price edits can
 * no longer change its COGS. Returns the new sales array (only unlocked sales
 * are touched) and how many were locked.
 */
export function saleNeedsCostLock(sale) {
  if (sale?.costsLocked) return false
  return (sale?.items || []).some(it => !(Number(it?.buyingPriceTZS) > 0))
}

export function lockSaleCosts(sales, products) {
  let lockedCount = 0
  const next = (sales || []).map(sale => {
    // Only sales whose COGS still depends on a live product price need freezing;
    // already-costed sales use their stored snapshot regardless.
    if (!saleNeedsCostLock(sale)) return sale
    lockedCount++
    const items = (sale.items || []).map(item => ({
      ...item,
      buyingPriceTZS: itemUnitCost(item, products, false),
    }))
    return { ...sale, items, costsLocked: true }
  })
  return { sales: next, lockedCount }
}

/**
 * Cash-basis recognition: revenue/COGS land in the period the money is
 * received. Each payment on a sale becomes one dated event carrying its
 * pro-rated share of net revenue, COGS, and gross cash (VAT included).
 *
 * Legacy sales (no `payments` array) recognize on the sale date: the recorded
 * `amountPaid`, or — for pre-feature sales with no field — the full total.
 */
export function salePaymentEvents(sale, products) {
  const total = sale.total || 0
  if (total <= 0) return []
  const net = saleNetRevenue(sale)
  const cogs = saleCogs(sale, products)

  let payments
  if (Array.isArray(sale.payments) && sale.payments.length) {
    payments = sale.payments
  } else {
    const paid = sale.amountPaid == null ? total : Math.max(0, Math.min(roundTz(sale.amountPaid), total))
    payments = paid > 0 ? [{ amount: paid, date: sale.date }] : []
  }

  return payments.map(p => {
    const amount = Math.max(0, Math.min(roundTz(p.amount), total))
    const frac = amount / total
    return {
      saleId: sale.id,
      date: p.date || sale.date,
      collected: amount,                 // gross cash received, VAT included
      revenue: roundTz(net * frac),      // net merchant revenue recognized
      cogs: roundTz(cogs * frac),        // COGS recognized in step
    }
  })
}

/** All dated payment events across every sale, for period aggregation. */
export function collectPaymentEvents(sales, products) {
  const events = []
  for (const s of sales) {
    for (const e of salePaymentEvents(s, products)) events.push(e)
  }
  return events
}

export function calcOrderTotals({ cartItems, vatRate, discountValue }) {
  const subtotal = roundTz(cartItems.reduce((a, i) => a + i.price * i.qty, 0))
  const rate = Number(vatRate) || 0
  const rawDiscount = Math.max(0, parseFloat(discountValue) || 0)
  const discountAmount = Math.min(roundTz(rawDiscount), subtotal)
  const vat = rate > 0 ? roundTz(subtotal * rate) : 0
  const total = Math.max(0, roundTz(subtotal + vat - discountAmount))
  return { subtotal, vat, discountAmount, total }
}
