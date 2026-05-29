import { useState, useRef } from 'react'
import { useApp } from '../App'
import { useT } from '../i18n/LangContext'
import { Printer, Download, DollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

function fmt(n) { return 'TZS ' + Number(Math.round(n)).toLocaleString() }
function fmtSign(n) { return (n < 0 ? '(' : '') + fmt(Math.abs(n)) + (n < 0 ? ')' : '') }

const TAB_KEYS = ['profitLoss', 'incomeStatement', 'expenseSummary', 'salesSummary']

const EXPENSE_CATS = ['Wages & Salary', 'Shipment', 'Rent', 'Electricity', 'Internet', 'Deliveries', 'Packaging', 'Miscellaneous', 'Other']

export default function FinancialReports() {
  const { data } = useApp()
  const t = useT()
  const [tab, setTab] = useState('profitLoss')
  const [pdfLoading, setPdfLoading] = useState(false)
  const reportRef = useRef(null)
  const today = new Date()
  const currentMonth = today.toISOString().slice(0, 7)

  const monthSales = data.sales.filter(s => s.date.startsWith(currentMonth))
  const monthExpenses = data.expenses.filter(e => e.date.startsWith(currentMonth))

  const revenue = monthSales.reduce((a, s) => a + s.total, 0)
  const totalExpenses = monthExpenses.reduce((a, e) => a + e.amount, 0)

  const rate = data.settings.exchangeRate || 2450
  const cogs = monthSales.reduce((a, s) => {
    return a + s.items.reduce((ia, item) => {
      const prod = data.products.find(p => p.id === item.productId)
      return ia + (prod ? prod.buyingPriceTZS * item.qty : 0)
    }, 0)
  }, 0)

  const grossProfit = revenue - cogs
  const netProfit = grossProfit - totalExpenses

  const expenseByCat = {}
  EXPENSE_CATS.forEach(c => { expenseByCat[c] = 0 })
  monthExpenses.forEach(e => { expenseByCat[e.category] = (expenseByCat[e.category] || 0) + e.amount })

  const monthName = today.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const storeName = data.settings.storeName

  function handlePrint() { window.print() }

  async function handleDownloadPdf() {
    const el = reportRef.current
    if (!el || pdfLoading) return
    setPdfLoading(true)
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid var(--outline)' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>{t(tab)} — {monthName}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-500)', marginTop: 4 }}>{storeName}</p>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: 10 }}>
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
                  {['Category', 'Transactions', 'Amount'].map(h => (
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
                  <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14 }}>Total</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13 }}>{monthExpenses.length}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14, color: 'var(--warning)' }}>{fmt(totalExpenses)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {tab === 'salesSummary' && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--outline)' }}>
                  {['Date', 'Customer', 'Items', 'Payment', 'Amount'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthSales.slice().sort((a, b) => b.date.localeCompare(a.date)).map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--outline)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-500)' }}>{s.date}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13 }}>{s.customer}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-500)' }}>{s.items.length}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                        background: s.paymentMethod === 'Cash' ? 'var(--success-light)' : s.paymentMethod === 'Card' ? 'var(--primary-light)' : 'var(--warning-light)',
                        color: s.paymentMethod === 'Cash' ? 'var(--success)' : s.paymentMethod === 'Card' ? 'var(--primary)' : 'var(--warning)'
                      }}>{s.paymentMethod}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13 }}>{fmt(s.total)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--outline)', background: 'var(--bg)' }}>
                  <td colSpan={4} style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14 }}>Total Revenue</td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14, color: 'var(--primary)' }}>{fmt(revenue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
