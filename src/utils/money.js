/** Whole TZS amounts — Tanzania shillings are not fractional. */
export function roundTz(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.round(x)
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

export function calcOrderTotals({ cartItems, vatRate, discountValue }) {
  const subtotal = roundTz(cartItems.reduce((a, i) => a + i.price * i.qty, 0))
  const rate = Number(vatRate) || 0
  const rawDiscount = Math.max(0, parseFloat(discountValue) || 0)
  const discountAmount = Math.min(roundTz(rawDiscount), subtotal)
  const vat = rate > 0 ? roundTz(subtotal * rate) : 0
  const total = Math.max(0, roundTz(subtotal + vat - discountAmount))
  return { subtotal, vat, discountAmount, total }
}
