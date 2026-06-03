const DEFAULT_DRAFT = {
  cart: [],
  customer: '',
  phone: '',
  payment: 'Cash',
  discountValue: '',
  amountPaid: '',
}

function draftKey(userId) {
  return `jeibe_pos_draft_${userId}`
}

export function loadPosDraft(userId) {
  if (!userId) return { ...DEFAULT_DRAFT }
  try {
    const raw = localStorage.getItem(draftKey(userId))
    if (!raw) return { ...DEFAULT_DRAFT }
    return { ...DEFAULT_DRAFT, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_DRAFT }
  }
}

export function savePosDraft(userId, draft) {
  if (!userId) return
  localStorage.setItem(draftKey(userId), JSON.stringify({
    cart: draft.cart ?? [],
    customer: draft.customer ?? '',
    phone: draft.phone ?? '',
    payment: draft.payment ?? 'Cash',
    discountValue: draft.discountValue ?? '',
    amountPaid: draft.amountPaid ?? '',
  }))
}

export function clearPosDraft(userId) {
  if (!userId) return
  localStorage.removeItem(draftKey(userId))
}

/** Keep cart in sync with live inventory (stock, price, name). */
export function reconcileCartWithProducts(cart, products) {
  if (!Array.isArray(cart)) return []
  return cart.map(item => {
    const product = products.find(p => p.id === item.productId)
    if (!product || product.qty <= 0) return null
    const maxQty = product.qty
    return {
      ...item,
      name: product.name,
      price: product.sellingPriceTZS,
      maxQty,
      qty: Math.min(item.qty, maxQty),
    }
  }).filter(Boolean)
}
