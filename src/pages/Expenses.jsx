import { useState, useEffect, useRef } from 'react'
import { useApp } from '../App'
import { useT } from '../i18n/LangContext'
import FormInput from '../components/FormInput'
import { Plus, X, Filter, Pencil, Trash2 } from 'lucide-react'

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
  const t = useT()
  const [tab, setTab] = useState('thisMonth')
  const [catFilter, setCatFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const modalRef = useRef(null)

  useEffect(() => {
    if (!modal) return
    const timer = setTimeout(() => modalRef.current?.querySelector('input')?.focus(), 0)
    return () => clearTimeout(timer)
  }, [modal])

  const today = new Date().toISOString().split('T')[0]
  const currentMonth = today.slice(0, 7)

  const byTab = data.expenses.filter(e => {
    if (tab === 'today') return e.date === today
    if (tab === 'thisMonth') return e.date.startsWith(currentMonth)
    if (tab === 'all') return true
    return e.date.startsWith(currentMonth)
  })

  const byCategory = catFilter === 'all' ? byTab : byTab.filter(e => e.category === catFilter)
  const sorted = [...byCategory].sort((a, b) => b.date.localeCompare(a.date))
  const total = sorted.reduce((a, e) => a + e.amount, 0)

  const monthExpenses = data.expenses.filter(e => e.date.startsWith(currentMonth))
  const catTotals = {}
  monthExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount })
  const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 4)

  function getCatMeta(name) { return CATEGORIES.find(c => c.label === name) || { icon: '📋', color: '#7A8694' } }

  function openAdd() {
    setForm(EMPTY_FORM)
    setErrors({})
    setModal('add')
  }

  function openEdit(exp) {
    setForm({
      id: exp.id,
      date: exp.date,
      category: exp.category,
      description: exp.description,
      amount: String(exp.amount),
      addedBy: exp.addedBy,
    })
    setErrors({})
    setModal('edit')
  }

  function validate() {
    const e = {}
    if (!form.description.trim()) e.description = 'Required'
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) e.amount = 'Enter valid amount'
    if (!form.date) e.date = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function saveExpense() {
    if (!validate()) return
    if (modal === 'add') {
      const expense = {
        id: 'exp' + Date.now(),
        date: form.date,
        category: form.category,
        description: form.description.trim(),
        amount: +form.amount,
        addedBy: currentUser.name,
      }
      updateData('expenses', [expense, ...data.expenses])
    } else {
      updateData('expenses', data.expenses.map(e =>
        e.id === form.id
          ? { ...e, date: form.date, category: form.category, description: form.description.trim(), amount: +form.amount }
          : e
      ))
    }
    setModal(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  function confirmDelete() {
    if (!deleteTarget) return
    updateData('expenses', data.expenses.filter(e => e.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <div className="r-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{t('expensesTitle')}</h1>
          <p style={{ color: 'var(--text-500)', fontSize: 13 }}>{t('expensesSub')}</p>
        </div>
        <button type="button" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}>
          <Plus size={15} /> {t('addExpenseTitle')}
        </button>
      </div>

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
          <Filter size={15} color="var(--text-500)" />
          <select className="form-select" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
            <option value="all">{t('allCategories')}</option>
            {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{t('totalLabel')}: <span style={{ color: 'var(--primary)' }}>{fmt(total)}</span></div>
      </div>

      <div className="r-scroll" style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)', maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--outline)' }}>
              {[t('dateLabel'), t('categoryLabel'), t('descriptionLabel'), t('amountTZS'), t('addedBy'), ''].map(h => (
                <th key={h || 'actions'} style={{ padding: '11px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.06em', textTransform: 'uppercase', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>{h}</th>
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
                  <td style={{ padding: '11px 12px', fontSize: 13, color: 'var(--text-500)' }}>{exp.date}</td>
                  <td style={{ padding: '11px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{meta.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{exp.category}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 12px', fontSize: 13 }}>{exp.description}</td>
                  <td style={{ padding: '11px 12px', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(exp.amount)}</td>
                  <td style={{ padding: '11px 12px', fontSize: 12, color: 'var(--text-500)' }}>{exp.addedBy}</td>
                  <td style={{ padding: '11px 8px 11px 12px', width: 72 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => openEdit(exp)} aria-label={t('edit')} title={t('edit')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, padding: 0, border: '1.5px solid var(--outline)', borderRadius: 6, color: 'var(--text-500)', background: 'transparent' }}>
                        <Pencil size={14} />
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(exp)} aria-label={t('delete')} title={t('delete')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, padding: 0, border: '1.5px solid var(--outline)', borderRadius: 6, color: 'var(--text-500)', background: 'transparent' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-500)', fontSize: 13 }}>{t('noExpenses')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div ref={modalRef} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 440, boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>{modal === 'add' ? t('addExpenseTitle') : t('editExpenseTitle')}</h2>
              <button type="button" onClick={() => setModal(null)} style={{ color: 'var(--text-500)', padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t('dateLabel')}</label>
                <FormInput type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} error={!!errors.date} selectOnFocus={false} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t('categoryLabel')}</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c.label}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: errors.description ? 'var(--danger)' : undefined }}>{t('descriptionLabel')}{errors.description ? ` — ${t('required')}` : ''}</label>
                <FormInput value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('descPlaceholder')} error={!!errors.description} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: errors.amount ? 'var(--danger)' : undefined }}>{t('amountTZS')}{errors.amount ? ` — ${t('required')}` : ''}</label>
                <FormInput numeric value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder={t('amountPlaceholder')} error={!!errors.amount} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button type="button" onClick={() => setModal(null)} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13 }}>{t('cancel')}</button>
              <button type="button" onClick={saveExpense} style={{ flex: 1, padding: '11px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}>
                {modal === 'add' ? t('addExpenseTitle') : t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 380, boxShadow: 'var(--shadow)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color="var(--danger)" />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>{t('deleteExpenseTitle')}</h2>
            <p style={{ color: 'var(--text-500)', fontSize: 13, textAlign: 'center', marginBottom: 8, lineHeight: 1.6 }}>
              <strong>{deleteTarget.description}</strong> · {fmt(deleteTarget.amount)}
            </p>
            <p style={{ color: 'var(--text-500)', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>{t('deleteExpenseMsg')}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13 }}>{t('cancel')}</button>
              <button type="button" onClick={confirmDelete} style={{ flex: 1, padding: '11px', background: 'var(--danger)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}>{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
