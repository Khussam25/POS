import { useState, useEffect, useRef } from 'react'
import { useApp } from '../App'
import { useT } from '../i18n/LangContext'
import FormInput from '../components/FormInput'
import { Search, Plus, Pencil, Trash2, X, AlertTriangle, AlertCircle } from 'lucide-react'

function fmt(n) { return 'TZS ' + Number(n).toLocaleString() }

const CATEGORIES = ['Moisturizers', 'Serums', 'Eye Care', 'Sunscreen', 'Foundation', 'Lip Care', 'Body Care', 'Anti-Aging', 'Toners', 'Cleansers', 'Other']

const EMPTY = { name: '', category: 'Moisturizers', buyingPriceTZS: '', sellingPriceTZS: '', qty: '', lowStockThreshold: 10, expiryDate: '', sku: '' }

export default function Inventory() {
  const { data, updateData } = useApp()
  const t = useT()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const modalRef = useRef(null)

  useEffect(() => {
    if (!modal) return
    const t = setTimeout(() => modalRef.current?.querySelector('input')?.focus(), 0)
    return () => clearTimeout(t)
  }, [modal])

  const filtered = data.products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || (filter === 'inStock' && p.qty > p.lowStockThreshold) || (filter === 'lowStock' && p.qty > 0 && p.qty <= p.lowStockThreshold) || (filter === 'outOfStock' && p.qty === 0)
    return matchSearch && matchFilter
  })

  function openAdd() { setForm(EMPTY); setErrors({}); setModal('add') }
  function openEdit(p) { setForm({ ...p, buyingPriceTZS: String(p.buyingPriceTZS), sellingPriceTZS: String(p.sellingPriceTZS), qty: String(p.qty), lowStockThreshold: String(p.lowStockThreshold) }); setErrors({}); setModal('edit') }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.sku.trim()) e.sku = 'Required'
    if (!form.buyingPriceTZS || isNaN(form.buyingPriceTZS) || +form.buyingPriceTZS <= 0) e.buyingPriceTZS = 'Enter valid price'
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
      const newProduct = { ...form, id: form.sku.trim(), sku: form.sku.trim().toUpperCase(), buyingPriceTZS: +form.buyingPriceTZS, sellingPriceTZS: +form.sellingPriceTZS, qty: +form.qty, lowStockThreshold: +form.lowStockThreshold || 10 }
      updateData('products', [newProduct, ...data.products])
    } else {
      updateData('products', data.products.map(p => p.id === form.id ? { ...form, buyingPriceTZS: +form.buyingPriceTZS, sellingPriceTZS: +form.sellingPriceTZS, qty: +form.qty, lowStockThreshold: +form.lowStockThreshold || 10 } : p))
    }
    setModal(null)
  }

  const Field = ({ label, field, type = 'text', placeholder, numeric }) => (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: errors[field] ? 'var(--danger)' : 'var(--text-900)' }}>{label}{errors[field] ? ` — ${errors[field]}` : ''}</label>
      <FormInput
        type={type}
        numeric={numeric}
        value={form[field] ?? ''}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        placeholder={placeholder}
        error={!!errors[field]}
        selectOnFocus={type !== 'date'}
      />
    </div>
  )

  return (
    <div className="r-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{t('inventoryTitle')}</h1>
          <p style={{ color: 'var(--text-500)', fontSize: 13 }}>{data.products.length} {t('productsTotal')}</p>
        </div>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}>
          <Plus size={15} /> {t('addProductTitle')}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
          <FormInput value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchProductsPlaceholder')} selectOnFocus={false}
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)' }} />
        </div>
        {[['all', t('all')], ['inStock', t('inStock')], ['lowStock', t('lowStock')], ['outOfStock', t('outOfStock')]].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            background: filter === key ? 'var(--accent)' : 'transparent',
            color: filter === key ? 'white' : 'var(--text-500)',
            border: filter === key ? 'none' : '1.5px solid var(--outline)'
          }}>{label}</button>
        ))}
      </div>

      {/* Table */}
      <div className="r-scroll" style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--outline)' }}>
              {[t('productName'), t('category'), t('qty'), t('buyingPrice'), t('sellingPrice'), t('stockStatus'), t('expiryDate'), ''].map(h => (
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
                  <td style={{ padding: '13px 16px', fontSize: 13 }}>{fmt(p.buyingPriceTZS)}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 600, fontSize: 13 }}>{fmt(p.sellingPriceTZS)}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                      background: isOut ? 'var(--danger-light)' : isLow ? 'var(--warning-light)' : 'var(--success-light)',
                      color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)'
                    }}>{isOut ? t('outOfStock') : isLow ? t('lowStock') : t('inStock')}</span>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-500)' }}>{p.expiryDate}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => openEdit(p)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', border: '1.5px solid var(--outline)', borderRadius: 7, fontSize: 12, fontWeight: 600, color: 'var(--text-500)', background: 'transparent', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-500)' }}>
                        <Pencil size={12} /> {t('edit')}
                      </button>
                      <button onClick={() => setDeleteTarget(p)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', border: '1.5px solid var(--outline)', borderRadius: 7, fontSize: 12, fontWeight: 600, color: 'var(--text-500)', background: 'transparent', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-500)' }}>
                        <Trash2 size={12} /> {t('delete')}
                      </button>
                    </div>
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
          <div ref={modalRef} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>{modal === 'add' ? t('addProductTitle') : t('editProductTitle')}</h2>
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
                <Field label="Buying Price (TZS)" field="buyingPriceTZS" numeric placeholder="e.g. 37000" />
                <Field label="Selling Price (TZS)" field="sellingPriceTZS" numeric placeholder="e.g. 55000" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Quantity" field="qty" numeric placeholder="e.g. 50" />
                <Field label="Low Stock Threshold" field="lowStockThreshold" numeric placeholder="e.g. 10" />
              </div>
              <Field label="Expiry Date" field="expiryDate" type="date" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13 }}>{t('cancel')}</button>
              <button onClick={save} style={{ flex: 1, padding: '11px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}>
                {modal === 'add' ? t('addProductTitle') : t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 380, boxShadow: 'var(--shadow)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color="var(--danger)" />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>{t('deleteProductTitle')}</h2>
            <p style={{ color: 'var(--text-500)', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
              <strong>{deleteTarget.name}</strong> {t('deleteProductMsg')}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13 }}>
                {t('cancel')}
              </button>
              <button onClick={() => { updateData('products', data.products.filter(p => p.id !== deleteTarget.id)); setDeleteTarget(null) }}
                style={{ flex: 1, padding: '11px', background: 'var(--danger)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}>
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
