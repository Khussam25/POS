import { useState } from 'react'
import { useApp } from '../App'
import { Search, Plus, Minus, Trash2, User, Phone, CheckCircle2 } from 'lucide-react'

function fmt(n) { return 'TZS ' + Number(n).toLocaleString() }

const PAYMENT_METHODS = ['Cash', 'Mobile Money', 'Card']

export default function PointOfSale() {
  const { currentUser, data, updateData } = useApp()
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [payment, setPayment] = useState('Cash')
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

  function removeFromCart(productId) {
    setCart(prev => prev.filter(i => i.productId !== productId))
  }

  const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0)
  const vat = Math.round(subtotal * vatRate)
  const total = subtotal + vat

  function completeSale() {
    if (cart.length === 0) return
    const now = new Date()
    const sale = {
      id: 's' + Date.now(),
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
      customer: customer.trim() || 'Walk-in Customer',
      items: cart.map(i => ({ productId: i.productId, name: i.name, qty: i.qty, price: i.price })),
      subtotal, vat, total, paymentMethod: payment,
      soldBy: currentUser.name
    }
    const newSales = [sale, ...data.sales]
    const newProducts = data.products.map(p => {
      const item = cart.find(i => i.productId === p.id)
      return item ? { ...p, qty: p.qty - item.qty } : p
    })
    updateData('sales', newSales)
    updateData('products', newProducts)
    setSuccess(sale)
    setCart([])
    setCustomer('')
    setPhone('')
    setPayment('Cash')
    setSearch('')
  }

  if (success) {
    return (
      <div style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '40px', textAlign: 'center', maxWidth: 400, width: '100%', boxShadow: 'var(--shadow)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={32} color="var(--success)" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Sale Completed!</h2>
          <p style={{ color: 'var(--text-500)', marginBottom: 24, fontSize: 13 }}>
            {success.customer} · {fmt(success.total)} · {success.paymentMethod}
          </p>
          <button onClick={() => setSuccess(null)} style={{
            background: 'var(--primary)', color: 'white', fontWeight: 700,
            padding: '12px 28px', borderRadius: 'var(--radius-sm)', fontSize: 14
          }}>New Sale</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Product list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '28px 24px 28px 32px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Point of Sale</h1>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products by name, category, or SKU..."
            style={{
              width: '100%', padding: '11px 14px 11px 40px',
              border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)',
              outline: 'none', fontSize: 13, background: 'var(--surface)'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--outline)'}
          />
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
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
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--outline)' }}
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
                        padding: '8px 16px', borderRadius: 999, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                        transition: 'background 0.15s'
                      }} onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
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

      {/* Cart */}
      <div style={{ width: 300, background: 'var(--surface)', borderLeft: '1px solid var(--outline)', display: 'flex', flexDirection: 'column', padding: 20, gap: 12, overflow: 'auto' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Cart</h2>

        <div style={{ position: 'relative' }}>
          <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
          <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Customer name (optional)"
            style={{ width: '100%', padding: '10px 12px 10px 34px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', outline: 'none', fontSize: 13, background: 'var(--bg)' }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--outline)'} />
        </div>
        <div style={{ position: 'relative' }}>
          <Phone size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number (optional)"
            style={{ width: '100%', padding: '10px 12px 10px 34px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', outline: 'none', fontSize: 13, background: 'var(--bg)' }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--outline)'} />
        </div>

        {/* Cart items */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cart.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-500)', fontSize: 13 }}>
              <div style={{ marginBottom: 6 }}>No items in cart</div>
              <div style={{ fontSize: 12 }}>Click a product to add it</div>
            </div>
          )}
          {cart.map(item => (
            <div key={item.productId} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{item.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => updateQty(item.productId, -1)} style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid var(--outline)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Minus size={12} />
                  </button>
                  <span style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.productId, 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid var(--outline)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={12} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{fmt(item.price * item.qty)}</span>
                  <button onClick={() => removeFromCart(item.productId)} style={{ color: 'var(--danger)', padding: 2 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ borderTop: '1px solid var(--outline)', paddingTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
            <span style={{ color: 'var(--text-500)' }}>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {data.settings.vatEnabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--text-500)' }}>VAT ({data.settings.vatRate}%)</span>
              <span>{fmt(vat)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 15, fontWeight: 800 }}>
            <span>Total</span>
            <span style={{ color: 'var(--primary)' }}>{fmt(total)}</span>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Payment Method</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {PAYMENT_METHODS.map(m => (
              <button key={m} onClick={() => setPayment(m)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                border: `2px solid ${payment === m ? 'var(--primary)' : 'var(--outline)'}`,
                background: payment === m ? 'var(--primary)' : 'transparent',
                color: payment === m ? 'white' : 'var(--text-900)', transition: 'all 0.15s'
              }}>{m}</button>
            ))}
          </div>

          <button onClick={completeSale} disabled={cart.length === 0} style={{
            width: '100%', padding: '13px', borderRadius: 'var(--radius-sm)',
            background: cart.length === 0 ? 'var(--outline)' : 'var(--accent)',
            color: cart.length === 0 ? 'var(--text-500)' : 'white',
            fontWeight: 700, fontSize: 14, transition: 'background 0.15s'
          }}
            onMouseEnter={e => { if (cart.length > 0) e.currentTarget.style.background = 'var(--accent-hover)' }}
            onMouseLeave={e => { if (cart.length > 0) e.currentTarget.style.background = 'var(--accent)' }}
          >
            Complete Sale · {fmt(total)}
          </button>
        </div>
      </div>
    </div>
  )
}
