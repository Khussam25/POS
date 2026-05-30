import { useState, useRef } from 'react'
import { useApp } from '../App'
import { useT } from '../i18n/LangContext'
import { Printer, Download, DollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import { SaleEditModal, SaleDeleteModal, SaleRowActions } from '../components/SaleEditModals'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { fmtMoney, saleNetRevenue, saleCogs } from '../utils/money'
import { cloneSaleForEdit, deleteSaleRecord, updateSaleRecord } from '../utils/salesOps'

const fmt = fmtMoney
function fmtSign(n) { return (n < 0 ? '(' : '') + fmt(Math.abs(n)) + (n < 0 ? ')' : '') }

const TAB_KEYS = ['profitLoss', 'incomeStatement', 'expenseSummary', 'salesSummary']
const EXPENSE_CATS = ['Wages & Salary', 'Shipment', 'Rent', 'Electricity', 'Internet', 'Deliveries', 'Packaging', 'Miscellaneous', 'Other']

export default function FinancialReports() {
  const { data, batchUpdateData } = useApp()
  const t = useT()
  const [tab, setTab] = useState('profitLoss')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [editSale, setEditSale] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saleError, setSaleError] = useState('')
  const reportRef = useRef(null)
  const today = new Date()
  const currentMonth = today.toISOString().slice(0, 7)
  const vatRate = data.settings.vatEnabled ? (data.settings.vatRate / 100) : 0

  const monthSales = data.sales.filter(s => s.date.startsWith(currentMonth))
  const monthExpenses = data.expenses.filter(e => e.date.startsWith(currentMonth))

  const revenue = monthSales.reduce((a, s) => a + saleNetRevenue(s), 0)
  const totalExpenses = monthExpenses.reduce((a, e) => a + e.amount, 0)

  const cogs = monthSales.reduce((a, s) => a + saleCogs(s, data.products), 0)

  const grossProfit = revenue - cogs
  const netProfit = grossProfit - totalExpenses

  const expenseByCat = {}
  EXPENSE_CATS.forEach(c => { expenseByCat[c] = 0 })
  monthExpenses.forEach(e => { expenseByCat[e.category] = (expenseByCat[e.category] || 0) + e.amount })

  const monthName = today.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const storeName = data.settings.storeName

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
      const filename = `${t(tab).replace(/\s+/g, '-')}-${currentMonth}.pdf`
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
      <div className="no-print" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{t('reportsTitle')}</h1>
        <p style={{ color: 'var(--text-500)', fontSize: 13 }}>{monthName} · {storeName}</p>
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

      {/* Tabs */}
      <div className="no-print" style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '6px', display: 'inline-flex', gap: 4, marginBottom: 24, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
        {TAB_KEYS.map(key => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            background: tab === key ? 'var(--accent)' : 'transparent',
            color: tab === key ? 'white' : 'var(--text-500)',
          }}>{t(key)}</button>
        ))}
      </div>

      {/* Report body */}
      <div ref={reportRef} className="financial-report-print" style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '28px 32px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
        <div className="report-pdf-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid var(--outline)' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>{t(tab)} — {monthName}</h2>
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
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-500)' }}>{monthExpenses.filter(e => e.category === c).length}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13 }}>{fmt(expenseByCat[c])}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--outline)', background: 'var(--bg)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14 }}>{t('totalLabel')}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13 }}>{monthExpenses.length}</td>
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
                {monthSales.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || '')).map(s => (
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
                {monthSales.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-500)', fontSize: 13 }}>{t('noSalesThisMonth')}</td></tr>
                )}
                {monthSales.length > 0 && (
                <tr style={{ borderTop: '2px solid var(--outline)', background: 'var(--bg)' }}>
                  <td colSpan={5} style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14 }}>{t('totalRevenue')}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14, color: 'var(--primary)' }}>{fmt(revenue)}</td>
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
