import { useState } from 'react'
import { useApp } from '../App'
import { Printer, Download, DollarSign, TrendingDown, TrendingUp } from 'lucide-react'

function fmt(n) { return 'TZS ' + Number(Math.round(n)).toLocaleString() }
function fmtSign(n) { return (n < 0 ? '(' : '') + fmt(Math.abs(n)) + (n < 0 ? ')' : '') }

const TABS = ['Profit & Loss', 'Income Statement', 'Expense Summary', 'Sales Summary']

const EXPENSE_CATS = ['Wages & Salary', 'Shipment', 'Rent', 'Electricity', 'Internet', 'Deliveries', 'Packaging', 'Miscellaneous', 'Other']

export default function FinancialReports() {
  const { data } = useApp()
  const [tab, setTab] = useState('Profit & Loss')
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

  const Row = ({ label, value, bold, indent, color, separator }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: separator ? '14px 0' : '8px 0', borderTop: separator ? '1px solid var(--outline)' : 'none', marginLeft: indent ? 24 : 0 }}>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 400, color: indent ? 'var(--text-500)' : 'var(--text-900)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 400, color: color || 'var(--text-900)' }}>{value}</span>
    </div>
  )

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Financial Reports</h1>
        <p style={{ color: 'var(--text-500)', fontSize: 13 }}>{monthName} · {storeName}</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Revenue', value: fmt(revenue), icon: DollarSign, color: '#1E4E8C' },
          { label: 'Total Expenses', value: fmt(totalExpenses), icon: TrendingDown, color: '#E07B20' },
          { label: 'Net Profit', value: fmt(Math.abs(netProfit)), icon: TrendingUp, color: netProfit >= 0 ? '#1A9E6B' : '#C92B36' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-500)', fontWeight: 500 }}>{label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: '-0.02em' }}>
              {netProfit < 0 && label === 'Net Profit' ? '- ' : ''}{value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '6px', display: 'inline-flex', gap: 4, marginBottom: 24, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            background: tab === t ? 'var(--accent)' : 'transparent',
            color: tab === t ? 'white' : 'var(--text-500)',
          }}>{t}</button>
        ))}
      </div>

      {/* Report body */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '28px 32px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid var(--outline)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>{tab} — {monthName}</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid var(--outline)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-500)', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-500)' }}>
              <Printer size={14} /> Print
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid var(--outline)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-500)', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-500)' }}>
              <Download size={14} /> Download PDF
            </button>
          </div>
        </div>

        {tab === 'Profit & Loss' && (
          <div style={{ maxWidth: 560 }}>
            <Row label="Revenue" value={fmt(revenue)} bold />
            <Row label="Cost of Goods Sold (COGS)" value={fmtSign(-cogs)} indent color="var(--danger)" />
            <Row label="Gross Profit" value={fmt(grossProfit)} bold separator color={grossProfit >= 0 ? 'var(--success)' : 'var(--danger)'} />
            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Operating Expenses</span>
            </div>
            {EXPENSE_CATS.filter(c => expenseByCat[c] > 0).map(c => (
              <Row key={c} label={c} value={fmtSign(-expenseByCat[c])} indent color="var(--danger)" />
            ))}
            <Row label="Total Operating Expenses" value={fmtSign(-totalExpenses)} bold separator color="var(--danger)" />
            <Row label="Net Profit / (Loss)" value={(netProfit < 0 ? '(' : '') + fmt(Math.abs(netProfit)) + (netProfit < 0 ? ')' : '')} bold separator color={netProfit >= 0 ? 'var(--success)' : 'var(--danger)'} />
          </div>
        )}

        {tab === 'Income Statement' && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Income</span>
            </div>
            <Row label="Sales Revenue" value={fmt(revenue)} />
            <Row label="Total Income" value={fmt(revenue)} bold separator color="var(--primary)" />
            <div style={{ marginTop: 20, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Expenses</span>
            </div>
            <Row label="Cost of Goods Sold" value={fmt(cogs)} indent />
            {EXPENSE_CATS.filter(c => expenseByCat[c] > 0).map(c => (
              <Row key={c} label={c} value={fmt(expenseByCat[c])} indent />
            ))}
            <Row label="Total Expenses" value={fmt(cogs + totalExpenses)} bold separator color="var(--warning)" />
            <Row label="Net Income" value={(netProfit < 0 ? '(' : '') + fmt(Math.abs(netProfit)) + (netProfit < 0 ? ')' : '')} bold separator color={netProfit >= 0 ? 'var(--success)' : 'var(--danger)'} />
          </div>
        )}

        {tab === 'Expense Summary' && (
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

        {tab === 'Sales Summary' && (
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
