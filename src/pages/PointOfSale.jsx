import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useApp, canAccess } from '../App'
import { useIsCompact } from '../hooks/useIsCompact'
import { useT } from '../i18n/LangContext'
import FormInput from '../components/FormInput'
import OrderCheckout from '../components/pos/OrderCheckout'
import { loadPosDraft, savePosDraft, clearPosDraft, reconcileCartWithProducts } from '../utils/posCart'
import { calcOrderTotals, fmtMoney } from '../utils/money'
import { findCustomerByName, makeCustomer } from '../utils/customers'
import { nextReceiptNo, visibleSales } from '../utils/salesOps'
import { nowTZParts } from '../utils/time'
import { Search, Plus, Minus, ShoppingCart, CheckCircle2, X, Package } from 'lucide-react'

const fmt = fmtMoney

function readDraftState(userId, products) {
  const draft = loadPosDraft(userId)
  return {
    cart: reconcileCartWithProducts(draft.cart, products),
    customer: draft.customer ?? '',
    phone: draft.phone ?? '',
    payment: draft.payment ?? 'Cash',
    discountValue: draft.discountValue ?? '',
    amountPaid: draft.amountPaid ?? '',
  }
}

export default function PointOfSale() {
  const { currentUser, data, batchUpdateData } = useApp()
  const [checkoutError, setCheckoutError] = useState(null)
  const navigate = useNavigate()
  const userId = currentUser?.id
  const isCompact = useIsCompact()
  const t = useT()
  const [mobileTab, setMobileTab] = useState('products')
  const [search, setSearch] = useState('')
  const [posDraft] = useState(() => readDraftState(userId, data.products))
  const [cart, setCart] = useState(posDraft.cart)
  const [customer, setCustomer] = useState(posDraft.customer)
  const [phone, setPhone] = useState(posDraft.phone)
  const [payment, setPayment] = useState(posDraft.payment)
  const [discountValue, setDiscountValue] = useState(posDraft.discountValue)
  const [amountPaid, setAmountPaid] = useState(posDraft.amountPaid)
  const [success, setSuccess] = useState(null)
  const [completing, setCompleting] = useState(false)
  const checkoutLock = useRef(false)

  useEffect(() => {
    if (!userId || success || completing) return
    const draft = readDraftState(userId, data.products)
    setCart(draft.cart)
    setCustomer(draft.customer)
    setPhone(draft.phone)
    setPayment(draft.payment)
    setDiscountValue(draft.discountValue)
    setAmountPaid(draft.amountPaid)
  }, [userId, success, completing])

  useEffect(() => {
    if (success || completing) return
    setCart(prev => {
      const next = reconcileCartWithProducts(prev, data.products)
      if (next.length === 0 && prev.length > 0) clearPosDraft(userId)
      return next
    })
  }, [data.products, userId, success, completing])

  useEffect(() => {
    if (!userId || success || completing) return
    savePosDraft(userId, { cart, customer, phone, payment, discountValue, amountPaid })
  }, [userId, cart, customer, phone, payment, discountValue, amountPaid])

  const vatRate = data.settings.vatEnabled ? (data.settings.vatRate / 100) : 0

  const products = data.products.filter(p =>
    p.qty > 0 && p.name.toLowerCase().includes(search.toLowerCase())
  )

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id)
      if (existing) {
        if (existing.qty >= product.qty) return prev
        return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { productId: product.id, name: product.name, price: product.sellingPriceTZS, qty: 1, maxQty: product.qty }]
    })
  }

  function updateQty(productId, delta) {
    setCart(prev => prev.map(i => {
      if (i.productId !== productId) return i
      // Authoritative cap = live stock, falling back to the cached maxQty.
      const stock = data.products.find(p => p.id === productId)?.qty
      const cap = stock ?? i.maxQty ?? Infinity
      const newQty = i.qty + delta
      if (newQty <= 0) return null
      if (newQty > cap) return i
      return { ...i, qty: newQty }
    }).filter(Boolean))
  }

  function stockOf(productId) {
    const p = data.products.find(pr => pr.id === productId)
    return p?.qty ?? Infinity
  }

  const { subtotal, vat, discountAmount, total } = calcOrderTotals({
    cartItems: cart,
    vatRate,
    discountValue,
  })

  function finishCheckoutAttempt() {
    checkoutLock.current = false
    setCompleting(false)
  }

  function completeSale() {
    if (cart.length === 0 || completing || checkoutLock.current) return
    checkoutLock.current = true
    setCompleting(true)
    setCheckoutError(null)

    for (const item of cart) {
      const product = data.products.find(p => p.id === item.productId)
      if (!product || product.qty < item.qty) {
        setCart(prev => reconcileCartWithProducts(prev, data.products))
        setCheckoutError(t('stockChanged'))
        finishCheckoutAttempt()
        return
      }
    }

    const name = customer.trim()
    const paidInput = amountPaid === '' ? total : Number(amountPaid)
    const settledPaid = Math.min(Math.max(0, Math.round(paidInput) || 0), total)
    const balance = total - settledPaid
    const isCredit = balance > 0

    if (isCredit && !name) {
      setCheckoutError(t('creditNeedsCustomer'))
      finishCheckoutAttempt()
      return
    }

    const existing = findCustomerByName(data.customers, name)
    let customerId = existing?.id ?? null
    let nextCustomers = data.customers

    if (name) {
      if (existing) {
        if (!existing.phone && phone.trim()) {
          nextCustomers = data.customers.map(c => c.id === existing.id ? { ...c, phone: phone.trim() } : c)
        }
      } else {
        const created = makeCustomer({ name, phone }, data.customers)
        customerId = created.id
        nextCustomers = [created, ...data.customers]
      }
    }

    const { date, time } = nowTZParts()
    const activeSales = visibleSales(data.sales, data.deletedSaleIds)
    const sale = {
      id: 's' + Date.now(),
      receiptNo: nextReceiptNo(activeSales),
      date,
      time,
      customer: name || 'Walk-in Customer',
      customerId,
      items: cart.map(i => {
        const product = data.products.find(p => p.id === i.productId)
        return {
          productId: i.productId,
          name: i.name,
          qty: i.qty,
          price: i.price,
          buyingPriceTZS: product?.buyingPriceTZS ?? 0,
        }
      }),
      subtotal, vat, discountAmount, total, paymentMethod: payment,
      amountPaid: settledPaid,
      payments: settledPaid > 0 ? [{ amount: settledPaid, date, by: currentUser.name }] : [],
      soldBy: currentUser.name
    }
    const newProducts = data.products.map(p => {
      const item = cart.find(i => i.productId === p.id)
      return item ? { ...p, qty: p.qty - item.qty } : p
    })
    const updates = { sales: [sale, ...activeSales], products: newProducts }
    if (nextCustomers !== data.customers) updates.customers = nextCustomers
    if (!batchUpdateData(updates)) {
      setCheckoutError(t('saveFailed'))
      finishCheckoutAttempt()
      return
    }

    clearPosDraft(userId)
    setCart([])
    setCustomer('')
    setPhone('')
    setPayment('Cash')
    setDiscountValue('')
    setAmountPaid('')
    setSearch('')
    setMobileTab('products')
    setCheckoutError(null)
    setSuccess(sale)
    finishCheckoutAttempt()
  }

  const successOverlay = success ? createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="pos-sale-success-title" style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(26,35,50,0.5)', padding: 24,
    }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '44px 36px', textAlign: 'center', maxWidth: 380, width: '100%', boxShadow: 'var(--shadow)' }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle2 size={34} color="var(--success)" />
        </div>
        <h2 id="pos-sale-success-title" style={{ fontSize: 21, fontWeight: 800, marginBottom: 8 }}>{t('saleCompleted')}</h2>
        <p style={{ color: 'var(--text-500)', marginBottom: 6, fontSize: 14 }}>{success.customer}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>{fmt(success.total)}</p>
        <p style={{ color: 'var(--text-500)', fontSize: 13, marginBottom: success.total - (success.amountPaid ?? success.total) > 0 ? 12 : 28 }}>{success.paymentMethod}</p>
        {success.total - (success.amountPaid ?? success.total) > 0 && (
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)', marginBottom: 28 }}>
            {t('balanceDue')}: {fmt(success.total - (success.amountPaid ?? success.total))}
          </p>
        )}
        <button type="button" onClick={() => setSuccess(null)} style={{
          background: 'var(--primary)', color: 'white', fontWeight: 700,
          padding: '12px 32px', borderRadius: 'var(--radius-sm)', fontSize: 14,
        }}>{t('newSale')}</button>
      </div>
    </div>,
    document.body,
  ) : null

  const cartCount = cart.reduce((a, i) => a + i.qty, 0)

  // ── Phone & tablet: tab-based layout (products | order) ───────────────────
  if (isCompact) {
    return (
      <>
      <div className="pos-page-compact">
        {/* Tab bar */}
        <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--outline)', flexShrink: 0 }}>
          {[{ key: 'products', label: t('products') }, { key: 'order', label: `${t('order')}${cartCount > 0 ? ` (${cartCount})` : ''}` }].map(tb => (
            <button key={tb.key} onClick={() => setMobileTab(tb.key)} style={{
              flex: 1, padding: '13px', fontWeight: 700, fontSize: 14,
              borderBottom: `3px solid ${mobileTab === tb.key ? 'var(--primary)' : 'transparent'}`,
              color: mobileTab === tb.key ? 'var(--primary)' : 'var(--text-500)',
              background: 'transparent', transition: 'all 0.15s'
            }}>{tb.label}</button>
          ))}
        </div>

        {mobileTab === 'products' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px' }}>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
              <FormInput variant="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchProducts')} selectOnFocus={false} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-500)' }}>
                  <Package size={40} strokeWidth={1.2} style={{ opacity: 0.25, marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-900)', marginBottom: 8 }}>{t('posNoProducts')}</div>
                  <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>{t('posNoProductsHint')}</p>
                  {canAccess(currentUser?.role, '/inventory') && (
                    <button type="button" onClick={() => navigate('/inventory')} style={{
                      background: 'var(--primary)', color: 'white', fontWeight: 700,
                      padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontSize: 13
                    }}>{t('goToInventory')}</button>
                  )}
                </div>
              ) : products.map(p => {
                const isLow = p.qty <= p.lowStockThreshold
                return (
                  <div key={p.id} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '12px 14px', border: '1px solid var(--outline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{fmt(p.sellingPriceTZS)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 12 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: isLow ? 'var(--warning-light)' : 'var(--success-light)', color: isLow ? 'var(--warning)' : 'var(--success)' }}>{isLow ? t('lowStock') : t('inStock')}</span>
                      <button onClick={() => addToCart(p)} style={{
                        background: 'var(--accent)', color: 'white', fontWeight: 700,
                        padding: '7px 14px', borderRadius: 999, fontSize: 12,
                        display: 'flex', alignItems: 'center', gap: 4
                      }}><Plus size={13} /> {t('add')}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {mobileTab === 'order' && (
          <div className="pos-order-panel" style={{ flex: 1, background: 'var(--bg)' }}>
            <div className="pos-order-cart" style={{ padding: '12px 16px' }}>
              {cart.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 48, color: 'var(--text-500)' }}>
                  <ShoppingCart size={40} strokeWidth={1.2} style={{ opacity: 0.25, marginBottom: 10 }} />
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{t('noItemsYet')}</div>
                  <button onClick={() => setMobileTab('products')} style={{ marginTop: 12, color: 'var(--primary)', fontWeight: 600, fontSize: 13 }}>{t('browseProducts')}</button>
                </div>
              )}
              {cart.map(item => (
                <div key={item.productId} style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--outline)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, flex: 1, paddingRight: 8, lineHeight: 1.3 }}>{item.name}</div>
                    <button onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} style={{ color: 'var(--text-500)', padding: 2 }}><X size={14} /></button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', borderRadius: 8, padding: '4px 10px', border: '1px solid var(--outline)' }}>
                      <button onClick={() => updateQty(item.productId, -1)} style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--outline)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} strokeWidth={2.5} /></button>
                      <span style={{ fontWeight: 700, fontSize: 14, minWidth: 18, textAlign: 'center' }}>{item.qty}</span>
                      {(() => {
                        const atMax = item.qty >= stockOf(item.productId)
                        return (
                          <button onClick={() => updateQty(item.productId, 1)} disabled={atMax} title={atMax ? t('maxStockReached') : undefined}
                            style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--outline)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: atMax ? 0.4 : 1, cursor: atMax ? 'not-allowed' : 'pointer' }}>
                            <Plus size={12} strokeWidth={2.5} />
                          </button>
                        )
                      })()}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(item.price * item.qty)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-500)' }}>{fmt(item.price)} {t('eachUnit')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {checkoutError && (
              <p style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600, padding: '0 4px 8px', textAlign: 'center' }}>{checkoutError}</p>
            )}
            <OrderCheckout
              compact
              t={t}
              cart={cart}
              subtotal={subtotal}
              vat={vat}
              vatRate={data.settings.vatRate}
              vatEnabled={data.settings.vatEnabled}
              discountValue={discountValue}
              setDiscountValue={setDiscountValue}
              discountAmount={discountAmount}
              total={total}
              customer={customer}
              setCustomer={setCustomer}
              phone={phone}
              setPhone={setPhone}
              payment={payment}
              setPayment={setPayment}
              customers={data.customers}
              amountPaid={amountPaid}
              setAmountPaid={setAmountPaid}
              onCompleteSale={completeSale}
              checkoutBusy={completing}
            />
          </div>
        )}
      </div>
      {successOverlay}
      </>
    )
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
  return (
    <>
    <div className="pos-page-desktop">

      {/* ── Left: Product list ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '28px 24px 28px 32px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>{t('pointOfSale')}</h1>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)', pointerEvents: 'none' }} />
          <FormInput
            variant="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchProducts')}
            selectOnFocus={false}
          />
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--outline)' }}>
                {[t('productName'), t('priceTZS'), t('stock'), ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const isLow = p.qty <= p.lowStockThreshold
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--outline)', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '13px 16px', fontWeight: 600, fontSize: 13 }}>{p.name}</td>
                    <td style={{ padding: '13px 16px', fontWeight: 700, fontSize: 13 }}>{fmt(p.sellingPriceTZS)}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                        background: isLow ? 'var(--warning-light)' : 'var(--success-light)',
                        color: isLow ? 'var(--warning)' : 'var(--success)'
                      }}>{isLow ? t('lowStock') : t('inStock')}</span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <button onClick={() => addToCart(p)} style={{
                        background: 'var(--accent)', color: 'white', fontWeight: 700,
                        padding: '8px 16px', borderRadius: 999, fontSize: 13,
                        display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s'
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
                        <Plus size={14} /> {t('add')}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {products.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-500)', fontSize: 13 }}>{t('noProductsFound')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Right: Order panel ── */}
      <div className="pos-order-panel" style={{ width: 300, background: 'var(--bg)', borderLeft: '1px solid var(--outline)', boxShadow: '-2px 0 12px rgba(26,35,50,0.06)' }}>

        {/* Header */}
        <div style={{ background: 'var(--primary)', padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'white' }}>
            <ShoppingCart size={17} strokeWidth={2.2} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{t('currentOrder')}</span>
          </div>
          {cart.length > 0 && (
            <button onClick={() => { setCart([]); setDiscountValue('') }} style={{
              background: 'rgba(255,255,255,0.18)', color: 'white', borderRadius: 999,
              padding: '4px 12px', fontSize: 12, fontWeight: 600, transition: 'background 0.15s'
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}>
              {t('clear')}
            </button>
          )}
        </div>

        {/* Cart items — scrolls; panel height stays fixed */}
        <div className="pos-order-cart">
          {cart.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 16, paddingBottom: 8, color: 'var(--text-500)' }}>
              <ShoppingCart size={28} strokeWidth={1.2} style={{ opacity: 0.3, marginBottom: 6 }} />
              <div style={{ fontSize: 12, fontWeight: 500 }}>{t('noItemsYet')}</div>
              <div style={{ fontSize: 11, marginTop: 2 }}>{t('clickAdd')}</div>
            </div>
          )}
          {cart.map(item => (
            <div key={item.productId} style={{
              background: 'var(--surface)', borderRadius: 10, padding: '12px 14px',
              border: '1px solid var(--outline)', boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, flex: 1, paddingRight: 8, lineHeight: 1.3 }}>{item.name}</div>
                <button onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} style={{ color: 'var(--text-500)', padding: 2, flexShrink: 0, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-500)'}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Qty stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', borderRadius: 8, padding: '4px 10px', border: '1px solid var(--outline)' }}>
                  <button onClick={() => updateQty(item.productId, -1)} style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--outline)', color: 'var(--text-900)', transition: 'background 0.15s'
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--outline)'}>
                    <Minus size={11} strokeWidth={2.5} />
                  </button>
                  <span style={{ fontWeight: 700, fontSize: 14, minWidth: 18, textAlign: 'center', color: 'var(--text-900)' }}>{item.qty}</span>
                  {(() => {
                    const atMax = item.qty >= stockOf(item.productId)
                    return (
                      <button onClick={() => updateQty(item.productId, 1)} disabled={atMax} title={atMax ? t('maxStockReached') : undefined} style={{
                        width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--outline)', color: 'var(--text-900)', transition: 'background 0.15s',
                        opacity: atMax ? 0.4 : 1, cursor: atMax ? 'not-allowed' : 'pointer'
                      }}
                        onMouseEnter={e => { if (!atMax) e.currentTarget.style.background = 'var(--primary-light)' }}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--outline)'}>
                        <Plus size={11} strokeWidth={2.5} />
                      </button>
                    )
                  })()}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(item.price * item.qty)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-500)' }}>{fmt(item.price)} {t('eachUnit')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ flexShrink: 0, borderTop: '2px solid var(--outline)' }}>
          {checkoutError && (
            <p style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600, padding: '8px 14px 0' }}>{checkoutError}</p>
          )}
          <OrderCheckout
            t={t}
            cart={cart}
            subtotal={subtotal}
            vat={vat}
            vatRate={data.settings.vatRate}
            vatEnabled={data.settings.vatEnabled}
            discountValue={discountValue}
            setDiscountValue={setDiscountValue}
            discountAmount={discountAmount}
            total={total}
            customer={customer}
            setCustomer={setCustomer}
            phone={phone}
            setPhone={setPhone}
            payment={payment}
            setPayment={setPayment}
            customers={data.customers}
            amountPaid={amountPaid}
            setAmountPaid={setAmountPaid}
            onCompleteSale={completeSale}
            checkoutBusy={completing}
          />
        </div>
      </div>
    </div>
    {successOverlay}
    </>
  )
}
