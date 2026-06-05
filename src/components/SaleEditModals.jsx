import { useMemo } from 'react'
import FormInput from './FormInput'
import { Pencil, Trash2, X, BadgeCheck } from 'lucide-react'
import { fmtMoney } from '../utils/money'
import { recalculateSale } from '../utils/salesOps'
import { findCustomerByName } from '../utils/customers'

const fmt = fmtMoney
const PAYMENT_METHODS = ['Cash', 'Mobile Money', 'Card']

export function SaleEditModal({ t, editSale, setEditSale, saleError, onSave, onClose, vatEnabled, vatRate, customers = [] }) {
  const editPreview = useMemo(() => {
    if (!editSale) return null
    return recalculateSale(editSale, vatRate)
  }, [editSale, vatRate])

  const matchedCustomer = editSale ? findCustomerByName(customers, editSale.customer) : null

  if (!editSale) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>{t('editSaleTitle')}</h2>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-500)', padding: 4 }}><X size={20} /></button>
        </div>

        {saleError && (
          <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{saleError}</div>
        )}

        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t('dateLabel')}</label>
              <FormInput type="date" value={editSale.date} onChange={e => setEditSale(s => ({ ...s, date: e.target.value }))} selectOnFocus={false} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t('payment')}</label>
              <select className="form-select" value={editSale.paymentMethod} onChange={e => setEditSale(s => ({ ...s, paymentMethod: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t('customer')}</label>
            <FormInput value={editSale.customer} onChange={e => {
              const name = e.target.value
              const matched = findCustomerByName(customers, name)
              setEditSale(s => ({ ...s, customer: name, customerId: matched?.id ?? null }))
            }} list="edit-sale-customer-list" />
            <datalist id="edit-sale-customer-list">
              {customers.map(c => <option key={c.id} value={c.name}>{c.code}{c.phone ? ` · ${c.phone}` : ''}</option>)}
            </datalist>
            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 5, color: matchedCustomer ? 'var(--primary)' : 'var(--text-500)', display: 'flex', alignItems: 'center', gap: 5 }}>
              {matchedCustomer
                ? <><BadgeCheck size={13} /> {t('existingCustomer')} · {matchedCustomer.code}</>
                : (editSale.customer || '').trim() && (editSale.customer || '').trim().toLowerCase() !== 'walk-in customer'
                  ? t('willCreateCustomer')
                  : t('walkInNoLink')}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t('discountTZS')}</label>
            <FormInput numeric value={String(editSale.discountAmount ?? '')} onChange={e => setEditSale(s => ({ ...s, discountAmount: e.target.value }))} />
          </div>
        </div>

        <div style={{ border: '1px solid var(--outline)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {[t('productName'), t('quantity'), t('unitPrice'), ''].map(h => (
                  <th key={h || 'rm'} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-500)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {editSale.items.map((item, idx) => (
                <tr key={`${item.productId}-${idx}`} style={{ borderTop: '1px solid var(--outline)' }}>
                  <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600 }}>{item.name}</td>
                  <td style={{ padding: '8px 10px', width: 88 }}>
                    <FormInput numeric value={String(item.qty)} onChange={e => setEditSale(s => ({
                      ...s,
                      items: s.items.map((it, i) => i === idx ? { ...it, qty: e.target.value } : it),
                    }))} />
                  </td>
                  <td style={{ padding: '8px 10px', width: 120 }}>
                    <FormInput numeric value={String(item.price)} onChange={e => setEditSale(s => ({
                      ...s,
                      items: s.items.map((it, i) => i === idx ? { ...it, price: e.target.value } : it),
                    }))} />
                  </td>
                  <td style={{ padding: '8px 10px', width: 40 }}>
                    <button type="button" aria-label={t('delete')} onClick={() => setEditSale(s => ({ ...s, items: s.items.filter((_, i) => i !== idx) }))}
                      style={{ color: 'var(--text-500)', padding: 4 }}>
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editPreview && (
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>{t('subtotal')}</span><span>{fmt(editPreview.subtotal)}</span></div>
            {vatEnabled && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>{t('tax')}</span><span>{fmt(editPreview.vat)}</span></div>
            )}
            {editPreview.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>{t('discountTZS')}</span><span>- {fmt(editPreview.discountAmount)}</span></div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, paddingTop: 8, borderTop: '1px solid var(--outline)' }}>
              <span>{t('total')}</span><span>{fmt(editPreview.total)}</span>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t('amountPaid')}</label>
              <FormInput
                numeric
                value={editSale.amountPaid === '' ? '' : String(editSale.amountPaid)}
                onChange={e => setEditSale(s => ({ ...s, amountPaid: e.target.value }))}
                placeholder={String(editPreview.total)}
              />
              {(() => {
                const paidInput = editSale.amountPaid === '' ? editPreview.total : Number(editSale.amountPaid)
                const settled = Math.min(Math.max(0, Math.round(paidInput) || 0), editPreview.total)
                const balance = editPreview.total - settled
                if (balance <= 0) return null
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, fontWeight: 600, color: 'var(--danger)' }}>
                    <span>{t('balanceDue')}</span>
                    <span>{fmt(balance)}</span>
                  </div>
                )
              })()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-500)', marginTop: 8 }}>{t('soldBy')}: {editSale.soldBy}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13 }}>{t('cancel')}</button>
          <button type="button" onClick={onSave} style={{ flex: 1, padding: '11px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}>{t('saveChanges')}</button>
        </div>
      </div>
    </div>
  )
}

export function SaleDeleteModal({ t, sale, onConfirm, onClose }) {
  if (!sale) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 380, boxShadow: 'var(--shadow)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Trash2 size={22} color="var(--danger)" />
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>{t('deleteSaleTitle')}</h2>
        <p style={{ color: 'var(--text-500)', fontSize: 13, textAlign: 'center', marginBottom: 8, lineHeight: 1.6 }}>
          <strong>{sale.customer}</strong> · {fmt(sale.total)}
        </p>
        <p style={{ color: 'var(--text-500)', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>{t('deleteSaleMsg')}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13 }}>{t('cancel')}</button>
          <button type="button" onClick={onConfirm} style={{ flex: 1, padding: '11px', background: 'var(--danger)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}>{t('delete')}</button>
        </div>
      </div>
    </div>
  )
}

export function SaleRowActions({ sale, t, onEdit, onDelete, canEdit = true, canDelete = true }) {
  if (!canEdit && !canDelete) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
      {canEdit && (
        <button type="button" onClick={() => onEdit(sale)} aria-label={t('edit')} title={t('edit')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, padding: 0, border: '1.5px solid var(--outline)', borderRadius: 6, color: 'var(--text-500)', background: 'transparent' }}>
          <Pencil size={14} />
        </button>
      )}
      {canDelete && (
        <button type="button" onClick={() => onDelete(sale)} aria-label={t('delete')} title={t('delete')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, padding: 0, border: '1.5px solid var(--outline)', borderRadius: 6, color: 'var(--text-500)', background: 'transparent' }}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
