import { useState } from 'react'
import { useApp } from '../App'
import { Search, Plus, Pencil, X, AlertTriangle, AlertCircle } from 'lucide-react'

function fmt(n) { return 'TZS ' + Number(n).toLocaleString() }

const CATEGORIES = ['Moisturizers', 'Serums', 'Eye Care', 'Sunscreen', 'Foundation', 'Lip Care', 'Body Care', 'Anti-Aging', 'Toners', 'Cleansers', 'Other']

const EMPTY = { name: '', category: 'Moisturizers', buyingPriceUSD: '', sellingPriceTZS: '', qty: '', lowStockThreshold: 10, expiryDate: '', sku: '' }

export default function Inventory() {
  const { data, updateData } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const filtered = data.products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || (filter === 'In Stock' && p.qty > p.lowStockThreshold) || (filter === 'Low Stock' && p.qty > 0 && p.qty <= p.lowStockThreshold) || (filter === 'Out of Stock' && p.qty === 0)
    return matchSearch && matchFilter
  })

  function openAdd() { setForm(EMPTY); setErrors({}); setModal('add') }
  function openEdit(p) { setForm({ ...p, buyingPriceUSD: String(p.buyingPriceUSD), sellingPriceTZS: String(p.sellingPriceTZS), qty: String(p.qty), lowStockThreshold: String(p.lowStockThreshold) }); setErrors({}); setModal('edit') }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.sku.trim()) e.sku = 'Required'
    if (!form.buyingPriceUSD || isNaN(form.buyingPriceUSD) || +form.buyingPriceUSD <= 0) e.buyingPriceUSD = 'Enter valid price'
    if (!form.sellingPriceTZS || isNaN(form.sellingPriceTZS) || +form.sellingPriceTZS <= 0) e.sellingPriceTZS = 'Enter valid price'
    if (!form.qty || isNaN(form.qty) || +form.qty < 0) e.qty = 'Enter valid qty'
    if (!form.expiryDate) e.expiryDate = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function save() {
    if (!validate()) return
    if (modal === 'add') {
      const skuExists = data.products.some(p => p.sku === form.sku.trim())
      if (skuExists) { setErrors(e => ({ ...e, sku: 'SKU already exists' })); return }
      const newProduct = { ...form, id: form.sku.trim(), sku: form.sku.trim().toUpperCase(), buyingPriceUSD: +form.buyingPriceUSD, sellingPriceTZS: +form.sellingPriceTZS, qty: +form.qty, lowStockThreshold: +form.lowStockThreshold || 10 }
      updateData('products', [newProduct, ...data.products])
    } else {
      updateData('products', data.products.map(p => p.id === form.id ? { ...form, buyingPriceUSD: +form.buyingPriceUSD, sellingPriceTZS: +form.sellingPriceTZS, qty: +form.qty, lowStockThreshold: +form.lowStockThreshold || 10 } : p))
    }
    setModal(null)
  }

  const Field = ({ label, field, type = 'text', placeholder }) => (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: errors[field] ? 'var(--danger)' : 'var(--text-900)' }}>{label}{errors[field] ? ` — ${errors[field]}` : ''}</label>
      <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors[field] ? 'var(--danger)' : 'var(--outline)'}`, borderRadius: 8, outline: 'none', fontSize: 13, background: 'var(--bg)' }}
        onFocus={e => { if (!errors[field]) e.target.style.borderColor = 'var(--primary)' }} onBlur={e => { if (!errors[field]) e.target.style.borderColor = 'var(--outline)' }} />
    </div>
  )

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Inventory</h1>
          <p style={{ color: 'var(--text-500)', fontSize: 13 }}>{data.products.length} products total</p>
        </div>
        <button onClick={openAdd} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
          background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13
        }}>
          <Plus size={15} /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', outline: 'none', fontSize: 13, background: 'var(--surface)' }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--outline)'} />
        </div>
        {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            background: filter === f ? 'var(--accent)' : 'transparent',
            color: filter === f ? 'white' : 'var(--text-500)',
            border: filter === f ? 'none' : '1.5px solid var(--outline)'
          }}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--outline)' }}>
              {['Product Name', 'Category', 'QTY', 'Buying Price (USD)', 'Selling Price (TZS)', 'Stock Status', 'Expiry Date', ''].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const isOut = p.qty === 0
              const isLow = !isOut && p.qty <= p.lowStockThreshold
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--outline)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-500)' }}>{p.sku}</div>
                  </td>
                  <td style={{ padding: '13px 16px', color: 'var(--text-500)', fontSize: 13 }}>{p.category}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--text-900)' }}>{p.qty}</span>
                      {isLow && <AlertTriangle size={13} color="var(--warning)" />}
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13 }}>${p.buyingPriceUSD.toFixed(2)}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 600, fontSize: 13 }}>{fmt(p.sellingPriceTZS)}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                      background: isOut ? 'var(--danger-light)' : isLow ? 'var(--warning-light)' : 'var(--success-light)',
                      color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)'
                    }}>{isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}</span>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-500)' }}>{p.expiryDate}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <button onClick={() => openEdit(p)} style={{ color: 'var(--text-500)', padding: 4, transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-500)'}>
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-500)', fontSize: 13 }}>No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>{modal === 'add' ? 'Add Product' : 'Edit Product'}</h2>
              <button onClick={() => setModal(null)} style={{ color: 'var(--text-500)', padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <Field label="Product Name" field="name" placeholder="e.g. CeraVe Moisturizing Cream" />
              <Field label="SKU" field="sku" placeholder="e.g. CV-MC-001" />
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--outline)', borderRadius: 8, outline: 'none', fontSize: 13, background: 'var(--bg)' }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Buying Price (USD)" field="buyingPriceUSD" type="number" placeholder="e.g. 14.99" />
                <Field label="Selling Price (TZS)" field="sellingPriceTZS" type="number" placeholder="e.g. 55000" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Quantity" field="qty" type="number" placeholder="e.g. 50" />
                <Field label="Low Stock Threshold" field="lowStockThreshold" type="number" placeholder="e.g. 10" />
              </div>
              <Field label="Expiry Date" field="expiryDate" type="date" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13 }}>Cancel</button>
              <button onClick={save} style={{ flex: 1, padding: '11px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}>
                {modal === 'add' ? 'Add Product' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
