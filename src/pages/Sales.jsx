import { useState } from 'react'
import { useApp } from '../App'
import { useT } from '../i18n/LangContext'
import { fmtMoney } from '../utils/money'
import { saleBalance, salePaymentStatus } from '../utils/customers'
import { cloneSaleForEdit, deleteSaleRecord, updateSaleRecord } from '../utils/salesOps'
import { SaleEditModal, SaleDeleteModal, SaleRowActions } from '../components/SaleEditModals'

const fmt = fmtMoney

export default function Sales() {
  const { data, batchUpdateData } = useApp()
  const t = useT()
  const [tab, setTab] = useState('thisMonth')
  const [editSale, setEditSale] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saleError, setSaleError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const currentMonth = today.slice(0, 7)
  const vatRate = data.settings.vatEnabled ? (data.settings.vatRate / 100) : 0

  const filtered = data.sales.filter(s => {
    if (tab === 'today') return s.date === today
    if (tab === 'thisMonth') return s.date.startsWith(currentMonth)
    if (tab === 'all') return true
    return s.date.startsWith(currentMonth)
  })
  const sorted = [...filtered].sort((a, b) =>
    b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || '')
  )
  const total = sorted.reduce((a, s) => a + s.total, 0)

  function openEdit(sale) {
    setSaleError('')
    setEditSale(cloneSaleForEdit(sale))
  }

  function saveEdit() {
    if (!editSale) return
    const result = updateSaleRecord(data.products, data.sales, editSale, vatRate)
    if (!result.ok) {
      if (result.error === 'insufficientStock') setSaleError(t('saleStockError'))
      else if (result.error === 'emptySale') setSaleError(t('saleEmptyError'))
      else setSaleError(t('saveFailed'))
      return
    }
    if (!batchUpdateData({ products: result.products, sales: result.sales })) {
      setSaleError(t('saveFailed'))
      return
    }
    setEditSale(null)
    setSaleError('')
  }

  function confirmDelete() {
    if (!deleteTarget) return
    const result = deleteSaleRecord(data.products, data.sales, deleteTarget.id)
    if (!result.ok) return
    batchUpdateData({ products: result.products, sales: result.sales })
    setDeleteTarget(null)
  }

  return (
    <div className="r-page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{t('salesHistory')}</h1>
        <p style={{ color: 'var(--text-500)', fontSize: 13 }}>{t('salesHistorySub')}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {[['today', t('today')], ['thisMonth', t('thisMonth')], ['all', t('all')]].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)} style={{
              padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: tab === key ? 'var(--accent)' : 'transparent',
              color: tab === key ? 'white' : 'var(--text-500)',
              border: tab === key ? 'none' : '1.5px solid var(--outline)',
            }}>{label}</button>
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          {t('totalLabel')}: <span style={{ color: 'var(--primary)' }}>{fmt(total)}</span>
        </div>
      </div>

      <div className="r-scroll" style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)', maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--outline)' }}>
              {[t('dateLabel'), t('customer'), t('itemsCol'), t('payment'), t('amount'), t('status'), t('soldBy'), ''].map(h => (
                <th key={h || 'actions'} style={{ padding: '11px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-500)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: h ? 'nowrap' : undefined, position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--outline)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '11px 12px', fontSize: 13, color: 'var(--text-500)', whiteSpace: 'nowrap' }}>
                  {s.date}{s.time ? ` · ${s.time}` : ''}
                </td>
                <td style={{ padding: '11px 12px', fontWeight: 600, fontSize: 13 }}>{s.customer}</td>
                <td style={{ padding: '11px 12px', fontSize: 13, color: 'var(--text-500)' }}>{s.items.length}</td>
                <td style={{ padding: '11px 12px' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                    background: s.paymentMethod === 'Cash' ? 'var(--success-light)' : s.paymentMethod === 'Card' ? 'var(--primary-light)' : 'var(--warning-light)',
                    color: s.paymentMethod === 'Cash' ? 'var(--success)' : s.paymentMethod === 'Card' ? 'var(--primary)' : 'var(--warning)',
                  }}>{s.paymentMethod}</span>
                </td>
                <td style={{ padding: '11px 12px', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                  {fmt(s.total)}
                  {saleBalance(s) > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)' }}>{fmt(saleBalance(s))} {t('dueLower')}</div>
                  )}
                </td>
                <td style={{ padding: '11px 12px' }}>
                  {(() => {
                    const st = salePaymentStatus(s)
                    const style = st === 'Paid'
                      ? { bg: 'var(--success-light)', fg: 'var(--success)', label: t('statusPaid') }
                      : st === 'Partial'
                        ? { bg: 'var(--warning-light)', fg: 'var(--warning)', label: t('statusPartial') }
                        : { bg: 'var(--danger-light)', fg: 'var(--danger)', label: t('statusUnpaid') }
                    return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: style.bg, color: style.fg, whiteSpace: 'nowrap' }}>{style.label}</span>
                  })()}
                </td>
                <td style={{ padding: '11px 12px', fontSize: 12, color: 'var(--text-500)' }}>{s.soldBy}</td>
                <td style={{ padding: '11px 8px 11px 12px', width: 72 }}>
                  <SaleRowActions sale={s} t={t} onEdit={openEdit} onDelete={setDeleteTarget} />
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-500)', fontSize: 13 }}>{t('noSalesFound')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <SaleEditModal
        t={t}
        editSale={editSale}
        setEditSale={setEditSale}
        saleError={saleError}
        onSave={saveEdit}
        onClose={() => { setEditSale(null); setSaleError('') }}
        vatEnabled={data.settings.vatEnabled}
        vatRate={vatRate}
      />
      <SaleDeleteModal
        t={t}
        sale={deleteTarget}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
