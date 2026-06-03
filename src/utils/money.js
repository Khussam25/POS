/** Whole TZS amounts — Tanzania shillings are not fractional. */
export function roundTz(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.round(x)
}

/** USD buying price → TZS (NY sales tax 8.625%, then × 2,650 TZS/USD). */
export const USD_TO_TZS = 2650
export const NY_SALES_TAX_RATE = 0.08625

export function buyingUsdToTzs(usd) {
  const n = Number(usd)
  if (!Number.isFinite(n) || n <= 0) return 0
  return roundTz(n * (1 + NY_SALES_TAX_RATE) * USD_TO_TZS)
}

export function buyingTzsToUsd(tzs) {
  const n = Number(tzs)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n / ((1 + NY_SALES_TAX_RATE) * USD_TO_TZS)
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

export function itemUnitCost(item, products) {
  if (item.buyingPriceTZS != null) return item.buyingPriceTZS
  const prod = products?.find(p => p.id === item.productId)
  return prod?.buyingPriceTZS ?? 0
}

export function saleCogs(sale, products) {
  return roundTz(
    sale.items.reduce((sum, item) => sum + itemUnitCost(item, products) * item.qty, 0)
  )
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
