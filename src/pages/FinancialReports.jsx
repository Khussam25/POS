import { useState, useRef, useMemo } from 'react'
import { useApp } from '../App'
import { useT, useLang } from '../i18n/LangContext'
import { Printer, Download, DollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import { SaleEditModal, SaleDeleteModal, SaleRowActions } from '../components/SaleEditModals'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { fmtMoney, saleNetRevenue, collectPaymentEvents } from '../utils/money'
import { cloneSaleForEdit, deleteSaleRecord, updateSaleRecord } from '../utils/salesOps'

const fmt = fmtMoney
function fmtSign(n) { return (n < 0 ? '(' : '') + fmt(Math.abs(n)) + (n < 0 ? ')' : '') }

const TAB_KEYS = ['profitLoss', 'incomeStatement', 'expenseSummary', 'salesSummary']
const EXPENSE_CATS = ['Wages & Salary', 'Shipment', 'Rent', 'Electricity', 'Internet', 'Deliveries', 'Packaging', 'Miscellaneous', 'Other']

const MONTH_NUMS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

function collectYears(sales, expenses, fallbackYear) {
  const years = new Set()
  for (let y = fallbackYear; y >= fallbackYear - 4; y--) years.add(String(y))
  sales.forEach(s => { if (s.date?.length >= 4) years.add(s.date.slice(0, 4)) })
  expenses.forEach(e => { if (e.date?.length >= 4) years.add(e.date.slice(0, 4)) })
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

function formatMonthLabel(ym, locale) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString(locale, { month: 'long', year: 'numeric' })
}

export default function FinancialReports() {
  const { data, batchUpdateData } = useApp()
  const t = useT()
  const { lang } = useLang()
  const locale = lang === 'sw' ? 'sw-TZ' : 'en-US'
  const [tab, setTab] = useState('profitLoss')
  const [periodType, setPeriodType] = useState('monthly')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [editSale, setEditSale] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saleError, setSaleError] = useState('')
  const reportRef = useRef(null)
  const today = new Date()
  const currentMonth = today.toISOString().slice(0, 7)
  const currentYear = today.getFullYear()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const vatRate = data.settings.vatEnabled ? (data.settings.vatRate / 100) : 0

  const yearOptions = useMemo(
    () => collectYears(data.sales, data.expenses, currentYear),
    [data.sales, data.expenses, currentYear]
  )

  const periodLabel = periodType === 'monthly'
    ? formatMonthLabel(selectedMonth, locale)
    : String(selectedYear)

  const periodKey = periodType === 'monthly' ? selectedMonth : String(selectedYear)

  const periodSales = useMemo(
    () => data.sales.filter(s => inPeriod(s.date, periodType, selectedMonth, selectedYear)),
    [data.sales, periodType, selectedMonth, selectedYear]
  )
  const periodExpenses = useMemo(
    () => data.expenses.filter(e => inPeriod(e.date, periodType, selectedMonth, selectedYear)),
    [data.expenses, periodType, selectedMonth, selectedYear]
  )

  // Cash basis: revenue/COGS are recognized in the period the payment is
  // received (by payment date), not when the sale was billed.
  const allEvents = useMemo(
    () => collectPaymentEvents(data.sales, data.products),
    [data.sales, data.products]
  )
  const periodEvents = useMemo(
    () => allEvents.filter(e => inPeriod(e.date, periodType, selectedMonth, selectedYear)),
    [allEvents, periodType, selectedMonth, selectedYear]
  )
  const revenue = periodEvents.reduce((a, e) => a + e.revenue, 0)
  const cogs = periodEvents.reduce((a, e) => a + e.cogs, 0)
  const totalExpenses = periodExpenses.reduce((a, e) => a + e.amount, 0)
  const grossProfit = revenue - cogs
  const netProfit = grossProfit - totalExpenses
  // Sales billed this period vs. still owed on them (a transaction view, by sale date).
  const grossSales = periodSales.reduce((a, s) => a + s.total, 0)
  const uncollectedRevenue = periodSales.reduce((a, s) => {
    const net = saleNetRevenue(s)
    const total = s.total || 0
    const paid = s.amountPaid == null ? total : Math.max(0, Math.min(s.amountPaid, total))
    const owedFrac = total > 0 ? (total - paid) / total : 0
    return a + net * owedFrac
  }, 0)

  const expenseByCat = useMemo(() => {
    const byCat = {}
    EXPENSE_CATS.forEach(c => { byCat[c] = 0 })
    periodExpenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount })
    return byCat
  }, [periodExpenses])

  const storeName = data.settings.storeName

  function handlePeriodTypeChange(next) {
    setPeriodType(next)
    if (next === 'yearly') setSelectedYear(Number(selectedMonth.slice(0, 4)) || currentYear)
  }

  function handleYearChange(y) {
    const year = String(y)
    setSelectedYear(Number(y))
    if (periodType === 'monthly') setSelectedMonth(`${year}-${selectedMonth.slice(5, 7)}`)
  }

  function openEditSale(sale) {
    setSaleError('')
    setEditSale(cloneSaleForEdit(sale))
  }

  function saveEditedSale() {
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

  function confirmDeleteSale() {
    if (!deleteTarget) return
    const result = deleteSaleRecord(data.products, data.sales, deleteTarget.id)
    if (!result.ok) return
    batchUpdateData({ products: result.products, sales: result.sales })
    setDeleteTarget(null)
  }

  function handlePrint() { window.print() }

  async function handleDownloadPdf() {
    const el = reportRef.current
    if (!el || pdfLoading) return
    setPdfLoading(true)
    const hidden = [...el.querySelectorAll('.no-print')]
    hidden.forEach(node => { node.style.display = 'none' })
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        ignoreElements: node => node.classList?.contains('no-print'),
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      const filename = `${t(tab).replace(/\s+/g, '-')}-${periodKey}.pdf`
      pdf.save(filename)
    } finally {
      hidden.forEach(node => { node.style.display = '' })
      setPdfLoading(false)
    }
  }

  const Row = ({ label, value, bold, indent, color, separator }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: separator ? '14px 0' : '8px 0', borderTop: separator ? '1px solid var(--outline)' : 'none', marginLeft: indent ? 24 : 0 }}>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 400, color: indent ? 'var(--text-500)' : 'var(--text-900)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 400, color: color || 'var(--text-900)' }}>{value}</span>
    </div>
  )

  return (
    <div className="r-page">
      <div className="no-print" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{t('reportsTitle')}</h1>
        <p style={{ color: 'var(--text-500)', fontSize: 13 }}>{storeName}</p>
      </div>

      {/* Summary cards */}
      <div className="r-three-col no-print" style={{ marginBottom: 28 }}>
        {[
          { label: t('totalRevenue'), value: fmt(revenue), icon: DollarSign, color: '#1E4E8C' },
          { label: t('totalExpenses'), value: fmt(totalExpenses), icon: TrendingDown, color: '#E07B20' },
          { label: t('netProfit'), value: fmt(Math.abs(netProfit)), icon: TrendingUp, color: netProfit >= 0 ? '#1A9E6B' : '#C92B36' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-500)', fontWeight: 500 }}>{label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: '-0.02em' }}>
              {netProfit < 0 && label === t('netProfit') ? '- ' : ''}{value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + period (fixed width — no shift when switching monthly/yearly) */}
      <div className="no-print reports-toolbar">
        <div className="reports-tabs">
          {TAB_KEYS.map(key => (
            <button key={key} type="button" onClick={() => setTab(key)} className={tab === key ? 'reports-tab reports-tab--active' : 'reports-tab'}>
              {t(key)}
            </button>
          ))}
        </div>
        <div className="reports-period">
          <span className="reports-period-label">{t('reportPeriod')}</span>
          <div className="reports-period-controls">
            <select
              className="form-select form-select--inline reports-period-type"
              value={periodType}
              onChange={e => handlePeriodTypeChange(e.target.value)}
              aria-label={t('reportPeriod')}
            >
              <option value="monthly">{t('periodMonthly')}</option>
              <option value="yearly">{t('periodYearly')}</option>
            </select>
            <select
              className="form-select form-select--inline reports-period-year"
              value={periodType === 'monthly' ? selectedMonth.slice(0, 4) : String(selectedYear)}
              onChange={e => handleYearChange(e.target.value)}
              aria-label={t('selectYear')}
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              className={`form-select form-select--inline reports-period-month${periodType !== 'monthly' ? ' reports-period-month--hidden' : ''}`}
              value={selectedMonth.slice(5, 7)}
              onChange={e => setSelectedMonth(`${selectedMonth.slice(0, 4)}-${e.target.value}`)}
              aria-label={t('selectMonth')}
              disabled={periodType !== 'monthly'}
              tabIndex={periodType === 'monthly' ? 0 : -1}
            >
              {MONTH_NUMS.map(m => (
                <option key={m} value={m}>{formatMonthName(m, locale)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Report body */}
      <div ref={reportRef} className="financial-report-print" style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '28px 32px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
        <div className="report-pdf-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid var(--outline)' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>{t(tab)} — {periodLabel}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-500)', marginTop: 4 }}>{storeName}</p>
          </div>
          <div className="no-print report-actions" style={{ display: 'flex', gap: 10 }}>
            <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid var(--outline)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-500)', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-500)' }}>
              <Printer size={14} /> {t('print')}
            </button>
            <button onClick={handleDownloadPdf} disabled={pdfLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid var(--outline)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-500)', transition: 'all 0.15s', opacity: pdfLoading ? 0.6 : 1 }}
              onMouseEnter={e => { if (!pdfLoading) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-500)' }}>
              <Download size={14} /> {pdfLoading ? '…' : t('downloadPDF')}
            </button>
          </div>
        </div>

        {tab === 'profitLoss' && (
          <div style={{ maxWidth: 560 }}>
            <Row label={t('revenue')} value={fmt(revenue)} bold />
            <Row label={t('cogs')} value={fmtSign(-cogs)} indent color="var(--danger)" />
            <Row label={t('grossProfit')} value={fmt(grossProfit)} bold separator color={grossProfit >= 0 ? 'var(--success)' : 'var(--danger)'} />
            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{t('operatingExpenses')}</span>
            </div>
            {EXPENSE_CATS.filter(c => expenseByCat[c] > 0).map(c => (
              <Row key={c} label={c} value={fmtSign(-expenseByCat[c])} indent color="var(--danger)" />
            ))}
            <Row label={t('totalOperatingExpenses')} value={fmtSign(-totalExpenses)} bold separator color="var(--danger)" />
            <Row label={t('netProfitLoss')} value={(netProfit < 0 ? '(' : '') + fmt(Math.abs(netProfit)) + (netProfit < 0 ? ')' : '')} bold separator color={netProfit >= 0 ? 'var(--success)' : 'var(--danger)'} />
          </div>
        )}

        {tab === 'incomeStatement' && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{t('income')}</span>
            </div>
            <Row label={t('salesRevenue')} value={fmt(revenue)} />
            <Row label={t('totalIncome')} value={fmt(revenue)} bold separator color="var(--primary)" />
            <div style={{ marginTop: 20, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{t('expenses')}</span>
            </div>
            <Row label={t('cogs')} value={fmt(cogs)} indent />
            {EXPENSE_CATS.filter(c => expenseByCat[c] > 0).map(c => (
              <Row key={c} label={c} value={fmt(expenseByCat[c])} indent />
            ))}
            <Row label={t('totalExpenses')} value={fmt(cogs + totalExpenses)} bold separator color="var(--warning)" />
            <Row label={t('netProfitLoss')} value={(netProfit < 0 ? '(' : '') + fmt(Math.abs(netProfit)) + (netProfit < 0 ? ')' : '')} bold separator color={netProfit >= 0 ? 'var(--success)' : 'var(--danger)'} />
          </div>
        )}

        {tab === 'expenseSummary' && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--outline)' }}>
                  {[t('categoryLabel'), t('transactions2'), t('amount')].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EXPENSE_CATS.filter(c => expenseByCat[c] > 0).map(c => (
                  <tr key={c} style={{ borderBottom: '1px solid var(--outline)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13 }}>{c}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-500)' }}>{periodExpenses.filter(e => e.category === c).length}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13 }}>{fmt(expenseByCat[c])}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--outline)', background: 'var(--bg)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14 }}>{t('totalLabel')}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13 }}>{periodExpenses.length}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14, color: 'var(--warning)' }}>{fmt(totalExpenses)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {tab === 'salesSummary' && (
          <div>
            <p className="no-print" style={{ fontSize: 13, color: 'var(--text-500)', marginBottom: 12 }}>
              {t('salesHistorySub')}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--outline)' }}>
                  {[t('dateLabel'), t('customer'), t('itemsCol'), t('payment'), t('amount'), ''].map(h => (
                    <th key={h || 'actions'} style={{ padding: '11px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-500)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: h ? 'nowrap' : undefined }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodSales.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || '')).map(s => (
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
                        color: s.paymentMethod === 'Cash' ? 'var(--success)' : s.paymentMethod === 'Card' ? 'var(--primary)' : 'var(--warning)'
                      }}>{s.paymentMethod}</span>
                    </td>
                    <td style={{ padding: '11px 12px', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(s.total)}</td>
                    <td className="no-print" style={{ padding: '11px 8px 11px 12px', width: 72 }}>
                      <SaleRowActions sale={s} t={t} onEdit={openEditSale} onDelete={setDeleteTarget} />
                    </td>
                  </tr>
                ))}
                {periodSales.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-500)', fontSize: 13 }}>{t('noSalesThisPeriod')}</td></tr>
                )}
                {periodSales.length > 0 && (
                <tr style={{ borderTop: '2px solid var(--outline)', background: 'var(--bg)' }}>
                  <td colSpan={5} style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14 }}>{t('grossSales')}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14, color: 'var(--primary)' }}>{fmt(grossSales)}</td>
                </tr>
                )}
                {periodSales.length > 0 && uncollectedRevenue > 0 && (
                <tr style={{ background: 'var(--bg)' }}>
                  <td colSpan={5} style={{ padding: '4px 16px 12px', fontSize: 12, color: 'var(--text-500)' }}>{t('uncollectedCredit')}</td>
                  <td style={{ padding: '4px 16px 12px', fontSize: 12, color: 'var(--text-500)' }}>{fmt(uncollectedRevenue)}</td>
                </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="no-print">
        <SaleEditModal
          t={t}
          editSale={editSale}
          setEditSale={setEditSale}
          saleError={saleError}
          onSave={saveEditedSale}
          onClose={() => { setEditSale(null); setSaleError('') }}
          vatEnabled={data.settings.vatEnabled}
          vatRate={vatRate}
        />
        <SaleDeleteModal
          t={t}
          sale={deleteTarget}
          onConfirm={confirmDeleteSale}
          onClose={() => setDeleteTarget(null)}
        />
      </div>
    </div>
  )
}
