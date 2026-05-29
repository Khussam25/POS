import { useState } from 'react'
import { useApp } from '../App'
import { Plus, X, Filter } from 'lucide-react'

function fmt(n) { return 'TZS ' + Number(n).toLocaleString() }

const CATEGORIES = [
  { label: 'Wages & Salary', icon: '👥', color: '#7B5EA7' },
  { label: 'Shipment', icon: '📦', color: '#E07B20' },
  { label: 'Rent', icon: '🏠', color: '#1A9E6B' },
  { label: 'Electricity', icon: '⚡', color: '#E0C420' },
  { label: 'Internet', icon: '🌐', color: '#1E7FB5' },
  { label: 'Deliveries', icon: '🚚', color: '#E07B20' },
  { label: 'Packaging', icon: '🗃️', color: '#7A8694' },
  { label: 'Miscellaneous', icon: '📋', color: '#7A8694' },
  { label: 'Other', icon: '💼', color: '#7A8694' },
]

const EMPTY_FORM = { date: new Date().toISOString().split('T')[0], category: 'Wages & Salary', description: '', amount: '' }

export default function Expenses() {
  const { currentUser, data, updateData } = useApp()
  const [tab, setTab] = useState('This Month')
  const [catFilter, setCatFilter] = useState('All Categories')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const today = new Date().toISOString().split('T')[0]
  const currentMonth = today.slice(0, 7)

  const byTab = data.expenses.filter(e => {
    if (tab === 'Today') return e.date === today
    if (tab === 'This Month') return e.date.startsWith(currentMonth)
    return true
  })

  const byCategory = catFilter === 'All Categories' ? byTab : byTab.filter(e => e.category === catFilter)
  const sorted = [...byCategory].sort((a, b) => b.date.localeCompare(a.date))
  const total = sorted.reduce((a, e) => a + e.amount, 0)

  // Category summaries for this month
  const monthExpenses = data.expenses.filter(e => e.date.startsWith(currentMonth))
  const catTotals = {}
  monthExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount })
  const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 4)

  function getCatMeta(name) { return CATEGORIES.find(c => c.label === name) || { icon: '📋', color: '#7A8694' } }

  function validate() {
    const e = {}
    if (!form.description.trim()) e.description = 'Required'
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) e.amount = 'Enter valid amount'
    if (!form.date) e.date = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function addExpense() {
    if (!validate()) return
    const expense = { id: 'exp' + Date.now(), date: form.date, category: form.category, description: form.description.trim(), amount: +form.amount, addedBy: currentUser.name }
    updateData('expenses', [expense, ...data.expenses])
    setShowModal(false)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  return (
    <div className="r-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Expenses</h1>
          <p style={{ color: 'var(--text-500)', fontSize: 13 }}>Track and manage all business expenses</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
          background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13
        }}><Plus size={15} /> Add Expense</button>
      </div>

      {/* Category summary cards */}
      <div className="r-stats" style={{ marginBottom: 24 }}>
        {topCats.map(([cat, amount]) => {
          const meta = getCatMeta(cat)
          return (
            <div key={cat} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{meta.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-500)' }}>{cat}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-900)' }}>{fmt(amount)}</div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {['Today', 'This Month'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? 'white' : 'var(--text-500)',
              border: tab === t ? 'none' : '1.5px solid var(--outline)'
            }}>{t}</button>
          ))}
          <Filter size={15} color="var(--text-500)" />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid var(--outline)', borderRadius: 8, outline: 'none', fontSize: 13, background: 'var(--surface)', color: 'var(--text-900)' }}>
            <option>All Categories</option>
            {CATEGORIES.map(c => <option key={c.label}>{c.label}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Total: <span style={{ color: 'var(--primary)' }}>{fmt(total)}</span></div>
      </div>

      {/* Table */}
      <div className="r-scroll" style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--outline)' }}>
              {['Date', 'Category', 'Description', 'Amount (TZS)', 'Added By'].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(exp => {
              const meta = getCatMeta(exp.category)
              return (
                <tr key={exp.id} style={{ borderBottom: '1px solid var(--outline)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-500)' }}>{exp.date}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{meta.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{exp.category}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13 }}>{exp.description}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, fontSize: 13 }}>{fmt(exp.amount)}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-500)' }}>{exp.addedBy}</td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-500)', fontSize: 13 }}>No expenses recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 440, boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Add Expense</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-500)', padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors.date ? 'var(--danger)' : 'var(--outline)'}`, borderRadius: 8, outline: 'none', fontSize: 13, background: 'var(--bg)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--outline)', borderRadius: 8, outline: 'none', fontSize: 13, background: 'var(--bg)' }}>
                  {CATEGORIES.map(c => <option key={c.label}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: errors.description ? 'var(--danger)' : undefined }}>Description{errors.description ? ` — ${errors.description}` : ''}</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Monthly electricity bill"
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors.description ? 'var(--danger)' : 'var(--outline)'}`, borderRadius: 8, outline: 'none', fontSize: 13, background: 'var(--bg)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: errors.amount ? 'var(--danger)' : undefined }}>Amount (TZS){errors.amount ? ` — ${errors.amount}` : ''}</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 180000"
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors.amount ? 'var(--danger)' : 'var(--outline)'}`, borderRadius: 8, outline: 'none', fontSize: 13, background: 'var(--bg)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13 }}>Cancel</button>
              <button onClick={addExpense} style={{ flex: 1, padding: '11px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}>Add Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
