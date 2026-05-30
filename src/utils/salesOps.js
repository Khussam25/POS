import { roundTz, calcOrderTotals } from './money'

/** Put sold quantities back into inventory. */
export function restoreInventoryFromSale(products, sale) {
  if (!sale?.items?.length) return products
  return products.map(p => {
    const item = sale.items.find(i => i.productId === p.id)
    return item ? { ...p, qty: p.qty + item.qty } : p
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
  return products.map(p => {
    const item = sale.items.find(i => i.productId === p.id)
    return item ? { ...p, qty: p.qty - item.qty } : p
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
    discountAmount: sale.discountAmount ?? 0,
    items: sale.items.map(i => ({ ...i })),
  }
}
