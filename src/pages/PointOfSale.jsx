import { useState } from 'react'
import { useApp } from '../App'
import { Search, Plus, Minus, ShoppingCart, Banknote, Smartphone, CreditCard, FileText, CheckCircle2, X } from 'lucide-react'

function fmt(n) { return 'TZS ' + Number(n).toLocaleString() }

const PAYMENT_METHODS = [
  { key: 'Cash',         label: 'Cash',   icon: Banknote },
  { key: 'Mobile Money', label: 'Mobile', icon: Smartphone },
  { key: 'Card',         label: 'Card',   icon: CreditCard },
]

export default function PointOfSale() {
  const { currentUser, data, updateData } = useApp()
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [payment, setPayment] = useState('Cash')
  const [discountType, setDiscountType] = useState('amount') // 'amount' | 'percent'
  const [discountValue, setDiscountValue] = useState('')
  const [success, setSuccess] = useState(null)

  const vatRate = data.settings.vatEnabled ? (data.settings.vatRate / 100) : 0

  const products = data.products.filter(p =>
    p.qty > 0 && (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    )
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
      const newQty = i.qty + delta
      if (newQty <= 0) return null
      if (newQty > i.maxQty) return i
      return { ...i, qty: newQty }
    }).filter(Boolean))
  }

  const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0)
  const vat = Math.round(subtotal * vatRate)
  const rawDiscount = parseFloat(discountValue) || 0
  const discountAmount = discountType === 'percent'
    ? Math.round(subtotal * (Math.min(rawDiscount, 100) / 100))
    : Math.min(rawDiscount, subtotal)
  const total = Math.max(0, subtotal + vat - discountAmount)

  function completeSale() {
    if (cart.length === 0) return
    const now = new Date()
    const sale = {
      id: 's' + Date.now(),
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
      customer: customer.trim() || 'Walk-in Customer',
      items: cart.map(i => ({ productId: i.productId, name: i.name, qty: i.qty, price: i.price })),
      subtotal, vat, discountAmount, discountType, total, paymentMethod: payment,
      soldBy: currentUser.name
    }
    updateData('sales', [sale, ...data.sales])
    updateData('products', data.products.map(p => {
      const item = cart.find(i => i.productId === p.id)
      return item ? { ...p, qty: p.qty - item.qty } : p
    }))
    setSuccess(sale)
    setCart([])
    setCustomer('')
    setPhone('')
    setPayment('Cash')
    setDiscountValue('')
    setDiscountType('amount')
    setSearch('')
  }

  if (success) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '44px 36px', textAlign: 'center', maxWidth: 380, width: '100%', boxShadow: 'var(--shadow)' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={34} color="var(--success)" />
          </div>
          <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 8 }}>Sale Completed!</h2>
          <p style={{ color: 'var(--text-500)', marginBottom: 6, fontSize: 14 }}>{success.customer}</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>{fmt(success.total)}</p>
          <p style={{ color: 'var(--text-500)', fontSize: 13, marginBottom: 28 }}>{success.paymentMethod}</p>
          <button onClick={() => setSuccess(null)} style={{
            background: 'var(--primary)', color: 'white', fontWeight: 700,
            padding: '12px 32px', borderRadius: 'var(--radius-sm)', fontSize: 14
          }}>New Sale</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Left: Product list ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '28px 24px 28px 32px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Point of Sale</h1>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products by name, category, or SKU..."
            style={{ width: '100%', padding: '11px 14px 11px 42px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', outline: 'none', fontSize: 13, background: 'var(--surface)' }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--outline)'}
          />
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--outline)' }}>
                {['Product Name', 'Category', 'Price (TZS)', 'Stock', ''].map(h => (
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
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-500)' }}>{p.sku}</div>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-500)' }}>{p.category}</td>
                    <td style={{ padding: '13px 16px', fontWeight: 700, fontSize: 13 }}>{fmt(p.sellingPriceTZS)}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                        background: isLow ? 'var(--warning-light)' : 'var(--success-light)',
                        color: isLow ? 'var(--warning)' : 'var(--success)'
                      }}>{isLow ? 'Low Stock' : 'In Stock'}</span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <button onClick={() => addToCart(p)} style={{
                        background: 'var(--accent)', color: 'white', fontWeight: 700,
                        padding: '8px 16px', borderRadius: 999, fontSize: 13,
                        display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s'
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
                        <Plus size={14} /> Add
                      </button>
                    </td>
                  </tr>
                )
              })}
              {products.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-500)', fontSize: 13 }}>No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Right: Order panel ── */}
      <div style={{ width: 310, background: 'var(--bg)', borderLeft: '1px solid var(--outline)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'var(--primary)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'white' }}>
            <ShoppingCart size={17} strokeWidth={2.2} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Current Order</span>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} style={{
              background: 'rgba(255,255,255,0.18)', color: 'white', borderRadius: 999,
              padding: '4px 12px', fontSize: 12, fontWeight: 600, transition: 'background 0.15s'
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}>
              Clear
            </button>
          )}
        </div>

        {/* Cart items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cart.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-500)' }}>
              <ShoppingCart size={36} strokeWidth={1.2} style={{ opacity: 0.3, marginBottom: 10 }} />
              <div style={{ fontSize: 13, fontWeight: 500 }}>No items yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Click + Add on a product</div>
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
                  <button onClick={() => updateQty(item.productId, 1)} style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--outline)', color: 'var(--text-900)', transition: 'background 0.15s'
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--outline)'}>
                    <Plus size={11} strokeWidth={2.5} />
                  </button>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(item.price * item.qty)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-500)' }}>{fmt(item.price)} ea</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totals + bottom controls */}
        <div style={{ flexShrink: 0, borderTop: '2px solid var(--outline)' }}>
          {/* Subtotal / Discount / Tax / Total */}
          <div style={{ padding: '16px 18px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--outline)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--text-500)' }}>Subtotal</span>
              <span style={{ fontWeight: 500 }}>{fmt(subtotal)}</span>
            </div>

            {/* Discount row */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-500)', minWidth: 58 }}>Discount</span>
                {/* Type toggle */}
                <div style={{ display: 'flex', border: '1.5px solid var(--outline)', borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
                  {['amount', 'percent'].map(t => (
                    <button key={t} onClick={() => { setDiscountType(t); setDiscountValue('') }} style={{
                      padding: '4px 8px', fontSize: 11, fontWeight: 700,
                      background: discountType === t ? 'var(--primary)' : 'transparent',
                      color: discountType === t ? 'white' : 'var(--text-500)',
                      transition: 'all 0.15s', borderRight: t === 'amount' ? '1px solid var(--outline)' : 'none'
                    }}>{t === 'percent' ? '%' : 'TZS'}</button>
                  ))}
                </div>
                <input
                  type="number" min="0" value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percent' ? '0' : '0'}
                  style={{
                    flex: 1, padding: '5px 8px', border: '1.5px solid var(--outline)',
                    borderRadius: 7, outline: 'none', fontSize: 13, background: 'var(--bg)',
                    textAlign: 'right'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--outline)'}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: discountAmount > 0 ? 'var(--success)' : 'var(--text-500)', minWidth: 60, textAlign: 'right' }}>
                  {discountAmount > 0 ? `- ${fmt(discountAmount)}` : fmt(0)}
                </span>
              </div>
            </div>

            {data.settings.vatEnabled && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--text-500)' }}>Tax ({data.settings.vatRate}%)</span>
                <span style={{ fontWeight: 500 }}>{fmt(vat)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1.5px solid var(--outline)' }}>
              <span style={{ fontSize: 17, fontWeight: 800 }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{fmt(total)}</span>
            </div>
          </div>

          {/* Customer details */}
          <div style={{ padding: '12px 14px', background: 'var(--bg)', borderBottom: '1px solid var(--outline)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Customer Details</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Name"
                style={{ flex: 1, padding: '9px 10px', border: '1.5px solid var(--outline)', borderRadius: 8, outline: 'none', fontSize: 12, background: 'var(--surface)' }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--outline)'} />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone"
                style={{ flex: 1, padding: '9px 10px', border: '1.5px solid var(--outline)', borderRadius: 8, outline: 'none', fontSize: 12, background: 'var(--surface)' }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--outline)'} />
            </div>
          </div>

          {/* Payment method */}
          <div style={{ padding: '12px 14px', background: 'var(--bg)', borderBottom: '1px solid var(--outline)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Payment Method</div>
            <div style={{ display: 'flex', gap: 7 }}>
              {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => {
                const active = payment === key
                return (
                  <button key={key} onClick={() => setPayment(key)} style={{
                    flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    border: `2px solid ${active ? 'var(--primary)' : 'var(--outline)'}`,
                    background: active ? 'var(--primary-soft)' : 'var(--surface)',
                    color: active ? 'var(--primary)' : 'var(--text-500)',
                    transition: 'all 0.15s'
                  }}>
                    <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ padding: '12px 14px', background: 'var(--bg)', display: 'flex', gap: 8 }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '12px 14px',
              border: '2px solid var(--outline)', borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)', color: 'var(--text-900)', fontWeight: 600, fontSize: 13,
              transition: 'all 0.15s', flexShrink: 0
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-900)' }}>
              <FileText size={15} /> Receipt
            </button>
            <button onClick={completeSale} disabled={cart.length === 0} style={{
              flex: 1, padding: '12px', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 14,
              background: cart.length === 0 ? 'var(--outline)' : 'var(--primary)',
              color: cart.length === 0 ? 'var(--text-500)' : 'white',
              transition: 'background 0.15s'
            }}
              onMouseEnter={e => { if (cart.length > 0) e.currentTarget.style.background = 'var(--primary-hover)' }}
              onMouseLeave={e => { if (cart.length > 0) e.currentTarget.style.background = 'var(--primary)' }}>
              Complete Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
