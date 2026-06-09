import { useState, useMemo } from 'react'
import { useApp, canEditSales } from '../App'
import { useT, useLang } from '../i18n/LangContext'
import { fmtMoney } from '../utils/money'
import { saleBalance, salePaymentStatus, resolveCustomerForSale, backfillCustomerIds } from '../utils/customers'
import { cloneSaleForEdit, deleteSaleRecord, updateSaleRecord, recalculateSale, saleItemsChanged, saleRef, itemsSummary, validateAndApplyAmountPaid, visibleSales } from '../utils/salesOps'
import { todayTZ } from '../utils/time'
import { SaleEditModal, SaleDeleteModal, SaleRowActions } from '../components/SaleEditModals'

const fmt = fmtMoney

const MONTH_NUMS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

function collectYears(sales, fallbackYear) {
  const years = new Set()
  for (let y = fallbackYear; y >= fallbackYear - 4; y--) years.add(String(y))
  sales.forEach(s => { if (s.date?.length >= 4) years.add(s.date.slice(0, 4)) })
  return [...years].sort((a, b) => b.localeCompare(a))
}

function formatMonthName(monthNum, locale) {
  return new Date(2000, Number(monthNum) - 1, 1).toLocaleString(locale, { month: 'long' })
}

function inPeriod(date, periodType, selectedMonth, selectedYear) {
  if (!date) return false
  if (periodType === 'monthly') return date.startsWith(selectedMonth)
  return date.startsWith(String(selectedYear))
}

export default function Sales() {
  const { data, batchUpdateData, currentUser } = useApp()
  const canEdit = canEditSales(currentUser.role)
  const t = useT()
  const { lang } = useLang()
  const locale = lang === 'sw' ? 'sw-TZ' : 'en-US'
  const today = todayTZ()
  const currentMonth = today.slice(0, 7)
  const currentYear = Number(today.slice(0, 4))
  const [periodType, setPeriodType] = useState('monthly')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [statusFilter, setStatusFilter] = useState('all')
  const [editSale, setEditSale] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saleError, setSaleError] = useState('')

  const vatRate = data.settings.vatEnabled ? (data.settings.vatRate / 100) : 0
  const yearOptions = useMemo(() => collectYears(data.sales, currentYear), [data.sales, currentYear])

  function handlePeriodTypeChange(next) {
    setPeriodType(next)
    if (next === 'yearly') setSelectedYear(Number(selectedMonth.slice(0, 4)) || currentYear)
  }
  function handleYearChange(y) {
    setSelectedYear(Number(y))
    if (periodType === 'monthly') setSelectedMonth(`${String(y)}-${selectedMonth.slice(5, 7)}`)
  }

  const filtered = visibleSales(data.sales, data.deletedSaleIds).filter(s => {
    if (!inPeriod(s.date, periodType, selectedMonth, selectedYear)) return false
    if (statusFilter === 'all') return true
    return salePaymentStatus(s).toLowerCase() === statusFilter
  })
  const sorted = [...filtered].sort((a, b) =>
    b.date.localeCompare(a.date)
    || (b.time || '').localeCompare(a.time || '')
    || String(b.id || '').localeCompare(String(a.id || ''))
  )
  const total = sorted.reduce((a, s) => a + s.total, 0)

  function openEdit(sale) {
    setSaleError('')
    setEditSale(cloneSaleForEdit(sale))
  }

  function saveEdit() {
    if (!editSale) return
    const orig = data.sales.find(s => s.id === editSale.id)
    const updates = {}
    let baseSales = data.sales

    // Only touch inventory / re-validate stock when items actually changed.
    if (saleItemsChanged(orig, editSale)) {
      const result = updateSaleRecord(data.products, data.sales, editSale, vatRate)
      if (!result.ok) {
        if (result.error === 'insufficientStock') setSaleError(t('saleStockError'))
        else if (result.error === 'emptySale') setSaleError(t('saleEmptyError'))
        else setSaleError(t('saveFailed'))
        return
      }
      updates.products = result.products
      baseSales = result.sales
    } else {
      const recalculated = recalculateSale(editSale, vatRate)
      baseSales = data.sales.map(s => s.id === editSale.id ? recalculated : s)
    }

    const name = (editSale.customer || '').trim()
    const resolved = resolveCustomerForSale(data.customers, name)
    const customerId = editSale.customerId && resolved.customers.some(c => c.id === editSale.customerId)
      ? editSale.customerId
      : resolved.customerId
    const customerName = customerId
      ? resolved.customers.find(c => c.id === customerId)?.name ?? resolved.customerName
      : resolved.customerName

    let nextSales = baseSales.map(s => s.id === editSale.id
      ? { ...s, customerId, customer: customerName }
      : s)
    const backfill = backfillCustomerIds(resolved.customers, nextSales)
    nextSales = backfill.sales

    const edited = nextSales.find(s => s.id === editSale.id)
    const paidResult = validateAndApplyAmountPaid(edited, editSale.amountPaid, customerName, currentUser.name)
    if (!paidResult.ok) {
      if (paidResult.error === 'creditNeedsCustomer') setSaleError(t('creditNeedsCustomer'))
      else setSaleError(t('saveFailed'))
      return
    }
    nextSales = nextSales.map(s => s.id === editSale.id ? paidResult.sale : s)

    updates.sales = nextSales
    if (resolved.customers !== data.customers) updates.customers = resolved.customers
    if (!batchUpdateData(updates)) {
      setSaleError(t('saveFailed'))
      return
    }
    setEditSale(null)
    setSaleError('')
  }

  function confirmDelete() {
    if (!deleteTarget) return
    const activeSales = visibleSales(data.sales, data.deletedSaleIds)
    const result = deleteSaleRecord(data.products, activeSales, deleteTarget.id)
    if (!result.ok) {
      setSaleError(t('saveFailed'))
      return
    }
    const deletedSaleIds = [...new Set([...(data.deletedSaleIds || []), deleteTarget.id])]
    if (!batchUpdateData({ products: result.products, sales: result.sales, deletedSaleIds })) {
      setSaleError(t('saveFailed'))
      return
    }
    setDeleteTarget(null)
    setSaleError('')
  }

  return (
    <div className="r-page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{t('salesHistory')}</h1>
        <p style={{ color: 'var(--text-500)', fontSize: 13 }}>{t('salesHistorySub')}</p>
      </div>

      {saleError && !editSale && (
        <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span>{saleError}</span>
          <button type="button" onClick={() => setSaleError('')} style={{ fontWeight: 700, fontSize: 16, lineHeight: 1 }} aria-label="Dismiss">×</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div className="reports-period">
          <span className="reports-period-label">{t('reportPeriod')}</span>
          <div className="reports-period-controls">
            <select className="form-select form-select--inline reports-period-type" value={periodType} onChange={e => handlePeriodTypeChange(e.target.value)} aria-label={t('reportPeriod')}>
              <option value="monthly">{t('periodMonthly')}</option>
              <option value="yearly">{t('periodYearly')}</option>
            </select>
            <select className="form-select form-select--inline reports-period-year" value={periodType === 'monthly' ? selectedMonth.slice(0, 4) : String(selectedYear)} onChange={e => handleYearChange(e.target.value)} aria-label={t('selectYear')}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              className={`form-select form-select--inline reports-period-month${periodType !== 'monthly' ? ' reports-period-month--hidden' : ''}`}
              value={selectedMonth.slice(5, 7)}
              onChange={e => setSelectedMonth(`${selectedMonth.slice(0, 4)}-${e.target.value}`)}
              aria-label={t('selectMonth')}
              disabled={periodType !== 'monthly'}
              tabIndex={periodType === 'monthly' ? 0 : -1}
            >
              {MONTH_NUMS.map(m => <option key={m} value={m}>{formatMonthName(m, locale)}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-500)', marginRight: 2 }}>{t('status')}:</span>
          {[['all', t('all')], ['paid', t('statusPaid')], ['partial', t('statusPartial')], ['unpaid', t('statusUnpaid')]].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setStatusFilter(key)} style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
              background: statusFilter === key ? 'var(--primary)' : 'transparent',
              color: statusFilter === key ? 'white' : 'var(--text-500)',
              border: statusFilter === key ? 'none' : '1.5px solid var(--outline)',
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
              {[t('dateLabel'), t('customer'), t('itemsCol'), t('payment'), t('amount'), t('status'), t('soldBy'), ...(canEdit ? [''] : [])].map(h => (
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
                  <div>{s.date}{s.time ? ` · ${s.time}` : ''}</div>
                  <code style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>{saleRef(s)}</code>
                </td>
                <td style={{ padding: '11px 12px', fontWeight: 600, fontSize: 13 }}>{s.customer}</td>
                <td style={{ padding: '11px 12px', fontSize: 13, maxWidth: 240 }}>
                  <div style={{ fontWeight: 600 }}>{s.items.length} {s.items.length === 1 ? t('itemSingular') : t('itemPlural')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-500)', lineHeight: 1.4 }}>{itemsSummary(s)}</div>
                </td>
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
                {canEdit && (
                  <td style={{ padding: '11px 8px 11px 12px', width: 72 }}>
                    <SaleRowActions
                      sale={s}
                      t={t}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                      canEdit={canEdit}
                      canDelete={canEdit}
                    />
                  </td>
                )}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={canEdit ? 8 : 7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-500)', fontSize: 13 }}>{t('noSalesFound')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <SaleEditModal
          t={t}
          editSale={editSale}
          setEditSale={setEditSale}
          saleError={saleError}
          onSave={saveEdit}
          onClose={() => { setEditSale(null); setSaleError('') }}
          vatEnabled={data.settings.vatEnabled}
          vatRate={vatRate}
          customers={data.customers}
        />
      )}
      {canEdit && (
        <SaleDeleteModal
          t={t}
          sale={deleteTarget}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
