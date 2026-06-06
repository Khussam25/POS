import { roundTz, calcOrderTotals } from './money'
import { salePaid } from './customers'
import { todayTZ, nowISO } from './time'

/** Next sequential human-readable receipt number, e.g. S-0001. */
export function nextReceiptNo(sales) {
  let max = 0
  for (const s of sales) {
    const m = /^S-(\d+)$/.exec(s.receiptNo || '')
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return 'S-' + String(max + 1).padStart(4, '0')
}

/** Display reference for a sale: its receipt number, or a stable id fallback. */
export function saleRef(sale) {
  return sale.receiptNo || ('#' + String(sale.id || '').slice(-5).toUpperCase())
}

/** One-line summary of items in a sale, e.g. "2× Lipstick · 1× Face Cream". */
export function itemsSummary(sale) {
  return (sale.items || []).map(i => `${i.qty}× ${i.name}`).join(' · ')
}

/** True if the edited sale changes items/quantities/prices/discount vs the original. */
export function saleItemsChanged(orig, edited) {
  const norm = its => (its || []).map(i => `${i.productId}|${Math.round(Number(i.qty) || 0)}|${Math.round(Number(i.price) || 0)}`).join(';')
  const discA = Math.round(Number(orig?.discountAmount || 0))
  const discB = Math.round(Number(edited?.discountAmount || 0))
  return norm(orig?.items) !== norm(edited?.items) || discA !== discB
}

/** Put sold quantities back into inventory. */
export function restoreInventoryFromSale(products, sale) {
  if (!sale?.items?.length) return products
  const ts = nowISO()
  return products.map(p => {
    const item = sale.items.find(i => i.productId === p.id)
    return item ? { ...p, qty: p.qty + item.qty, updatedAt: ts } : p
  })
}

/** Check whether inventory can cover a sale (after optional restore of a prior version). */
export function canFulfillSale(products, sale) {
  for (const item of sale.items) {
    const product = products.find(p => p.id === item.productId)
    if (!product || product.qty < item.qty) return false
  }
  return sale.items.length > 0
}

/** Deduct sold quantities from inventory. */
export function deductInventoryForSale(products, sale) {
  const ts = nowISO()
  return products.map(p => {
    const item = sale.items.find(i => i.productId === p.id)
    return item ? { ...p, qty: p.qty - item.qty, updatedAt: ts } : p
  })
}

export function recalculateSale(sale, vatRate) {
  const items = sale.items.map(i => ({
    ...i,
    qty: Math.max(0, Math.round(Number(i.qty) || 0)),
    price: roundTz(Number(i.price) || 0),
  })).filter(i => i.qty > 0 && i.price >= 0)

  const { subtotal, vat, discountAmount, total } = calcOrderTotals({
    cartItems: items.map(i => ({ price: i.price, qty: i.qty })),
    vatRate,
    discountValue: sale.discountAmount ?? 0,
  })

  return {
    ...sale,
    items: items.map(i => ({
      productId: i.productId,
      name: i.name,
      qty: i.qty,
      price: i.price,
      buyingPriceTZS: i.buyingPriceTZS ?? 0,
    })),
    subtotal,
    vat,
    discountAmount,
    total,
  }
}

export function deleteSaleRecord(products, sales, saleId) {
  const sale = sales.find(s => s.id === saleId)
  if (!sale) return { ok: false, error: 'notFound' }
  return {
    ok: true,
    products: restoreInventoryFromSale(products, sale),
    sales: sales.filter(s => s.id !== saleId),
  }
}

export function updateSaleRecord(products, sales, nextSale, vatRate) {
  const old = sales.find(s => s.id === nextSale.id)
  if (!old) return { ok: false, error: 'notFound' }

  const recalculated = recalculateSale(nextSale, vatRate)
  if (recalculated.items.length === 0) return { ok: false, error: 'emptySale' }

  let stock = restoreInventoryFromSale(products, old)
  if (!canFulfillSale(stock, recalculated)) {
    return { ok: false, error: 'insufficientStock' }
  }
  stock = deductInventoryForSale(stock, recalculated)

  return {
    ok: true,
    products: stock,
    sales: sales.map(s => (s.id === recalculated.id ? recalculated : s)),
  }
}

export function cloneSaleForEdit(sale) {
  return {
    ...sale,
    customer: sale.customer ?? '',
    customerId: sale.customerId ?? null,
    discountAmount: sale.discountAmount ?? 0,
    amountPaid: String(salePaid(sale)),
    items: sale.items.map(i => ({ ...i })),
  }
}

/** Set how much has been paid on a sale; appends to the payment trail when increased. */
export function applyAmountPaidUpdate(sale, paidInput, by) {
  const total = sale.total || 0
  const parsed = paidInput === '' || paidInput == null ? total : Number(paidInput)
  const nextPaid = Math.min(Math.max(0, roundTz(parsed) || 0), total)
  const prevPaid = salePaid(sale)
  const delta = roundTz(nextPaid - prevPaid)
  if (delta === 0) return { ...sale, amountPaid: nextPaid }

  let payments = Array.isArray(sale.payments) ? [...sale.payments] : []
  if (delta > 0) {
    payments.push({ amount: delta, date: todayTZ(), by })
  } else {
    payments = nextPaid > 0
      ? [{ amount: nextPaid, date: sale.date, by: sale.soldBy || by }]
      : []
  }

  return { ...sale, amountPaid: nextPaid, payments }
}

/** Validate credit rules and apply an amount-paid change to a sale. */
export function validateAndApplyAmountPaid(sale, paidInput, customerName, by) {
  const total = sale.total || 0
  const parsed = paidInput === '' || paidInput == null ? total : Number(paidInput)
  const nextPaid = Math.min(Math.max(0, roundTz(parsed) || 0), total)
  if (nextPaid < total && !(customerName || '').trim()) {
    return { ok: false, error: 'creditNeedsCustomer' }
  }
  return { ok: true, sale: applyAmountPaidUpdate(sale, paidInput, by) }
}
