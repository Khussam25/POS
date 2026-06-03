import { useState, useEffect, useRef, useMemo } from 'react'
import { useApp } from '../App'
import { useRefreshDataOnMount } from '../hooks/useRefreshData'
import { useT } from '../i18n/LangContext'
import FormField from '../components/FormField'
import FormInput from '../components/FormInput'
import { fmtMoney } from '../utils/money'
import { formatPhoneDisplay } from '../utils/phone'
import {
  makeCustomer, customerStats, customerSales, totalReceivables,
  saleBalance, salePaid, salePaymentStatus, applyPayment,
  linkSalesToCustomer,
} from '../utils/customers'
import { saleRef, itemsSummary } from '../utils/salesOps'
import { Plus, Pencil, Trash2, X, Search, Wallet, Users, HandCoins, Link2 } from 'lucide-react'

const fmt = fmtMoney
const EMPTY = { name: '', phone: '', note: '' }

const STATUS_STYLE = {
  Paid: { bg: 'var(--success-light)', fg: 'var(--success)' },
  Partial: { bg: 'var(--warning-light)', fg: 'var(--warning)' },
  Unpaid: { bg: 'var(--danger-light)', fg: 'var(--danger)' },
}

function StatusBadge({ status, t }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Paid
  const label = status === 'Paid' ? t('statusPaid') : status === 'Partial' ? t('statusPartial') : t('statusUnpaid')
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: s.bg, color: s.fg, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '18px 20px', border: '1px solid var(--outline)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: accent + '1a', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-500)', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-900)' }}>{value}</div>
      </div>
    </div>
  )
}

/** Browse every unlinked sale (search + optional date filter), check off any to attach. */
function SaleLinkPicker({ selectedIds, setSelectedIds, sales, t }) {
  const [q, setQ] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const unlinked = useMemo(
    () => sales.filter(s => !s.customerId).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))),
    [sales]
  )
  const list = unlinked.filter(s => {
    if (dateFilter && s.date !== dateFilter) return false
    const needle = q.trim().toLowerCase()
    if (!needle) return true
    return saleRef(s).toLowerCase().includes(needle)
      || itemsSummary(s).toLowerCase().includes(needle)
      || String(s.total).includes(needle.replace(/[^\d]/g, ''))
  })
  const allSelected = list.length > 0 && list.every(s => selectedIds.includes(s.id))

  function toggle(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleAll() {
    if (allSelected) {
      const ids = new Set(list.map(s => s.id))
      setSelectedIds(prev => prev.filter(id => !ids.has(id)))
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...list.map(s => s.id)])])
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t('searchSales')}</label>
          <FormInput variant="compact" value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchSalesPlaceholder')} selectOnFocus={false} style={{ width: '100%' }} />
        </div>
        <div style={{ flex: '0 0 150px' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t('purchaseDate')}</label>
          <FormInput type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} selectOnFocus={false} style={{ width: '100%' }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
        <span style={{ color: 'var(--text-500)', fontWeight: 600 }}>{list.length} {t('unlinkedCount')}</span>
        {list.length > 0 && (
          <button type="button" onClick={toggleAll} style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
            {allSelected ? t('clearAll') : t('selectAll')}
          </button>
        )}
      </div>
      <div style={{ border: '1px solid var(--outline)', borderRadius: 10, maxHeight: 240, overflowY: 'auto' }}>
        {list.length === 0 ? (
          <div style={{ padding: '18px', textAlign: 'center', fontSize: 12, color: 'var(--text-500)' }}>{t('noUnlinkedSales')}</div>
        ) : list.map(s => {
          const checked = selectedIds.includes(s.id)
          const bal = saleBalance(s)
          return (
            <label key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderBottom: '1px solid var(--outline)', cursor: 'pointer', background: checked ? 'var(--primary-light)' : 'transparent' }}>
              <input type="checkbox" checked={checked} onChange={() => toggle(s.id)} style={{ width: 15, height: 15, marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  <code style={{ color: 'var(--primary)', fontWeight: 700 }}>{saleRef(s)}</code>
                  {' · '}{s.date}{s.time ? ` ${s.time}` : ''} · {itemsSummary(s) || t('saleLabel')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-500)' }}>
                  {fmt(s.total)} · {fmt(salePaid(s))} {t('paidLower')}{bal > 0 ? ` · ${fmt(bal)} ${t('dueLower')}` : ''}
                </div>
              </div>
              <StatusBadge status={salePaymentStatus(s)} t={t} />
            </label>
          )
        })}
      </div>
      {selectedIds.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>{selectedIds.length} {t('selectedSales')}</div>
      )}
    </div>
  )
}

export default function Customers() {
  const { data, updateData, batchUpdateData, currentUser, dataRevision } = useApp()
  const t = useT()
  useRefreshDataOnMount()

  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)       // 'add' | 'edit'
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [detail, setDetail] = useState(null)      // customerId being viewed
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payError, setPayError] = useState('')
  // Add/edit-flow: optionally link existing past sales to the customer.
  const [linkAdd, setLinkAdd] = useState(false)
  const [addSel, setAddSel] = useState([])
  const [unlinkSel, setUnlinkSel] = useState([])   // edit-flow: sales to detach
  // Standalone link modal for an existing customer.
  const [linkModal, setLinkModal] = useState(null)
  const [linkSel, setLinkSel] = useState([])
  const modalRef = useRef(null)

  const customers = data.customers || []
  const sales = data.sales || []

  const rows = useMemo(() => {
    return customers.map(c => ({ customer: c, stats: customerStats(c, sales) }))
  }, [customers, sales, dataRevision])

  const receivables = totalReceivables(sales)
  const owingCount = rows.filter(r => r.stats.outstanding > 0).length

  const visibleRows = rows
    .filter(r => tab !== 'owing' || r.stats.outstanding > 0)
    .filter(r => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return r.customer.name.toLowerCase().includes(q)
        || (r.customer.code || '').toLowerCase().includes(q)
        || (r.customer.phone || '').includes(q)
    })
    .sort((a, b) => b.stats.outstanding - a.stats.outstanding || a.customer.name.localeCompare(b.customer.name))

  useEffect(() => {
    if (!modal) return
    const id = setTimeout(() => modalRef.current?.querySelector('input')?.focus(), 0)
    return () => clearTimeout(id)
  }, [modal])

  function resetLinkState() {
    setLinkAdd(false); setAddSel([]); setUnlinkSel([])
  }
  function openAdd() {
    setForm(EMPTY); setErrors({})
    resetLinkState()
    setModal('add')
  }
  function openEdit(c) {
    setForm({ id: c.id, name: c.name, phone: formatPhoneDisplay(c.phone || ''), note: c.note || '' })
    setErrors({})
    resetLinkState()
    setModal('edit')
  }
  function toggleUnlink(id) {
    setUnlinkSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = t('required')
    else {
      const dup = customers.some(c => c.name.trim().toLowerCase() === form.name.trim().toLowerCase() && c.id !== form.id)
      if (dup) e.name = t('customerNameTaken')
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function save() {
    if (!validate()) return
    if (modal === 'add') {
      const c = makeCustomer({ name: form.name, phone: form.phone, note: form.note }, customers)
      if (linkAdd && addSel.length) {
        const nextSales = linkSalesToCustomer(sales, addSel, c)
        batchUpdateData({ customers: [c, ...customers], sales: nextSales })
      } else {
        updateData('customers', [c, ...customers])
      }
    } else {
      const newName = form.name.trim()
      const orig = customers.find(c => c.id === form.id)
      const nextCustomers = customers.map(c => c.id === form.id
        ? { ...c, name: newName, phone: form.phone.trim(), note: form.note.trim() }
        : c)
      let nextSales = sales
      // Keep linked sales' displayed name in sync if the name changed.
      if (orig && orig.name !== newName) {
        nextSales = nextSales.map(s => s.customerId === form.id ? { ...s, customer: newName } : s)
      }
      // Detach sales marked for unlinking.
      if (unlinkSel.length) {
        const set = new Set(unlinkSel)
        nextSales = nextSales.map(s => set.has(s.id) ? { ...s, customerId: null, customer: 'Walk-in Customer' } : s)
      }
      // Attach any newly selected past sales.
      if (linkAdd && addSel.length) {
        nextSales = linkSalesToCustomer(nextSales, addSel, { id: form.id, name: newName })
      }
      if (nextSales !== sales) batchUpdateData({ customers: nextCustomers, sales: nextSales })
      else updateData('customers', nextCustomers)
    }
    setModal(null)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    updateData('customers', customers.filter(c => c.id !== deleteTarget.id))
    setDeleteTarget(null)
    if (detail === deleteTarget.id) setDetail(null)
  }

  const detailCustomer = detail ? customers.find(c => c.id === detail) : null
  const detailSales = detailCustomer ? customerSales(sales, detailCustomer.id) : []
  const detailStats = detailCustomer ? customerStats(detailCustomer, sales) : null

  function openDetail(id) {
    setDetail(id)
    setPayAmount('')
    setPayError('')
  }

  function recordPayment() {
    setPayError('')
    if (!detailCustomer) return
    const amt = Math.round(Number(payAmount) || 0)
    if (amt <= 0) { setPayError(t('enterAmount')); return }
    if (amt > detailStats.outstanding) { setPayError(t('paymentExceeds')); return }
    const nextSales = applyPayment(sales, detailCustomer.id, amt, currentUser.name)
    batchUpdateData({ sales: nextSales })
    setPayAmount('')
  }

  function openLink(c) { setLinkSel([]); setLinkModal(c) }
  function saveLink() {
    if (!linkModal || linkSel.length === 0) { setLinkModal(null); return }
    const nextSales = linkSalesToCustomer(sales, linkSel, linkModal)
    batchUpdateData({ sales: nextSales })
    setLinkModal(null)
  }

  return (
    <div className="r-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{t('customersTitle')}</h1>
          <p style={{ color: 'var(--text-500)', fontSize: 13 }}>{t('customersSub')}</p>
        </div>
        <button onClick={openAdd} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
          background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13
        }}><Plus size={15} /> {t('addCustomer')}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 22 }}>
        <StatCard icon={Wallet} label={t('totalReceivables')} value={fmt(receivables)} accent="#C92B36" />
        <StatCard icon={Users} label={t('totalCustomers')} value={customers.length} accent="#1E4E8C" />
        <StatCard icon={HandCoins} label={t('customersOwing')} value={owingCount} accent="#B7791F" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['all', t('all')], ['owing', t('owing')]].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)} style={{
              padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: tab === key ? 'var(--accent)' : 'transparent',
              color: tab === key ? 'white' : 'var(--text-500)',
              border: tab === key ? 'none' : '1.5px solid var(--outline)',
            }}>{label}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)', pointerEvents: 'none' }} />
          <FormInput variant="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchCustomers')} selectOnFocus={false} />
        </div>
      </div>

      <div className="r-scroll" style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--outline)' }}>
              {[t('code'), t('customer'), t('phone'), t('purchased'), t('paidLabel'), t('outstanding'), ''].map(h => (
                <th key={h || 'actions'} style={{ padding: '11px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-500)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ customer: c, stats }) => (
              <tr key={`${c.id}-${dataRevision}`} style={{ borderBottom: '1px solid var(--outline)', cursor: 'pointer' }}
                onClick={() => openDetail(c.id)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '11px 12px' }}>
                  <code style={{ fontSize: 12, background: 'var(--bg)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--outline)' }}>{c.code}</code>
                </td>
                <td style={{ padding: '11px 12px', fontWeight: 600, fontSize: 13 }}>{c.name}</td>
                <td style={{ padding: '11px 12px', fontSize: 13, color: 'var(--text-500)', whiteSpace: 'nowrap' }}>{formatPhoneDisplay(c.phone) || '—'}</td>
                <td style={{ padding: '11px 12px', fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(stats.purchased)}</td>
                <td style={{ padding: '11px 12px', fontSize: 13, whiteSpace: 'nowrap', color: 'var(--success)' }}>{fmt(stats.paid)}</td>
                <td style={{ padding: '11px 12px', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', color: stats.outstanding > 0 ? 'var(--danger)' : 'var(--text-500)' }}>
                  {stats.outstanding > 0 ? fmt(stats.outstanding) : '—'}
                </td>
                <td style={{ padding: '11px 12px', width: 90 }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEdit(c)} title={t('edit')} style={{ padding: 6, borderRadius: 6, color: 'var(--text-500)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-500)'}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(c)} title={t('delete')} style={{ padding: 6, borderRadius: 6, color: 'var(--text-500)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-500)'}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-500)', fontSize: 13 }}>{t('noCustomers')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div ref={modalRef} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 440, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexShrink: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>{modal === 'add' ? t('addCustomer') : t('editCustomer')}</h2>
              <button onClick={() => setModal(null)} style={{ color: 'var(--text-500)', padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 14, overflowY: 'auto' }}>
              <FormField label={t('fullName')} value={form.name} onChange={name => setForm(f => ({ ...f, name }))} error={errors.name} placeholder="e.g. Amina Hassan" />
              <FormField label={t('phone')} phone value={form.phone} onChange={phone => setForm(f => ({ ...f, phone }))} placeholder="+255 712 345 678" />
              <FormField label={t('noteOptional')} value={form.note} onChange={note => setForm(f => ({ ...f, note }))} placeholder={t('notePlaceholder')} />
              {modal === 'edit' && (
                <div style={{ borderTop: '1px solid var(--outline)', paddingTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-500)', marginBottom: 8 }}>{t('linkedSales')}</div>
                  {customerSales(sales, form.id).length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-500)', marginBottom: 4 }}>{t('noLinkedSales')}</div>
                  ) : (
                    <div style={{ border: '1px solid var(--outline)', borderRadius: 10, maxHeight: 200, overflowY: 'auto' }}>
                      {customerSales(sales, form.id).map(s => {
                        const willUnlink = unlinkSel.includes(s.id)
                        return (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 12px', borderBottom: '1px solid var(--outline)', opacity: willUnlink ? 0.5 : 1 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, textDecoration: willUnlink ? 'line-through' : 'none' }}>
                                <code style={{ color: 'var(--primary)', fontWeight: 700 }}>{saleRef(s)}</code> · {s.date} · {itemsSummary(s) || t('saleLabel')}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-500)' }}>{fmt(s.total)} · {fmt(salePaid(s))} {t('paidLower')}{saleBalance(s) > 0 ? ` · ${fmt(saleBalance(s))} ${t('dueLower')}` : ''}</div>
                            </div>
                            <button type="button" onClick={() => toggleUnlink(s.id)} title={willUnlink ? t('undo') : t('removeLink')} style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: willUnlink ? 'var(--primary)' : 'var(--danger)', padding: '2px 6px' }}>
                              {willUnlink ? t('undo') : t('removeLink')}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 14 }}>
                    <input type="checkbox" checked={linkAdd} onChange={e => setLinkAdd(e.target.checked)} style={{ width: 16, height: 16 }} />
                    {t('linkSalesOptional')}
                  </label>
                  {linkAdd && (
                    <div style={{ marginTop: 14 }}>
                      <SaleLinkPicker selectedIds={addSel} setSelectedIds={setAddSel} sales={sales} t={t} />
                    </div>
                  )}
                </div>
              )}
              {modal === 'add' && (
                <div style={{ borderTop: '1px solid var(--outline)', paddingTop: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <input type="checkbox" checked={linkAdd} onChange={e => setLinkAdd(e.target.checked)} style={{ width: 16, height: 16 }} />
                    {t('linkSalesOptional')}
                  </label>
                  {linkAdd && (
                    <div style={{ marginTop: 14 }}>
                      <SaleLinkPicker selectedIds={addSel} setSelectedIds={setAddSel} sales={sales} t={t} />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, flexShrink: 0 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13 }}>{t('cancel')}</button>
              <button onClick={save} style={{ flex: 1, padding: '11px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}>
                {modal === 'add' ? t('addCustomer') : t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer detail / ledger */}
      {detailCustomer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 620, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 16px', borderBottom: '1px solid var(--outline)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ fontSize: 19, fontWeight: 800 }}>{detailCustomer.name}</h2>
                  <code style={{ fontSize: 12, background: 'var(--bg)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--outline)' }}>{detailCustomer.code}</code>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-500)', marginTop: 4 }}>
                  {formatPhoneDisplay(detailCustomer.phone) || t('noPhone')}{detailCustomer.note ? ` · ${detailCustomer.note}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <button onClick={() => openLink(detailCustomer)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
                  background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 12,
                }}><Link2 size={14} /> {t('linkPastSale')}</button>
                <button onClick={() => setDetail(null)} style={{ color: 'var(--text-500)', padding: 4 }}><X size={20} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, padding: '16px 24px', borderBottom: '1px solid var(--outline)', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 90px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-500)', fontWeight: 600 }}>{t('purchased')}</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{fmt(detailStats.purchased)}</div>
              </div>
              <div style={{ flex: '1 1 90px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-500)', fontWeight: 600 }}>{t('paidLabel')}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)' }}>{fmt(detailStats.paid)}</div>
              </div>
              <div style={{ flex: '1 1 90px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-500)', fontWeight: 600 }}>{t('outstanding')}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: detailStats.outstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(detailStats.outstanding)}</div>
              </div>
              <div style={{ flex: '1 1 90px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-500)', fontWeight: 600 }}>{t('itemsCol')}</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{detailStats.txnCount}</div>
              </div>
            </div>

            {detailStats.outstanding > 0 && (
              <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--outline)', background: 'var(--bg)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-500)', marginBottom: 8 }}>{t('recordPayment')}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <FormInput numeric variant="compact"
                      value={payAmount === '' ? '' : Number(payAmount).toLocaleString('en-US')}
                      onChange={e => { setPayAmount(e.target.value.replace(/[^\d]/g, '')); setPayError('') }}
                      placeholder={Number(detailStats.outstanding).toLocaleString('en-US')}
                      style={{ width: '100%', textAlign: 'right' }} />
                    {payError && <div style={{ color: 'var(--danger)', fontSize: 11, fontWeight: 600, marginTop: 4 }}>{payError}</div>}
                  </div>
                  <button type="button" onClick={() => setPayAmount(String(detailStats.outstanding))} style={{
                    padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: '2px solid var(--outline)', background: 'var(--surface)', color: 'var(--text-500)', flexShrink: 0,
                  }}>{t('payAll')}</button>
                  <button type="button" onClick={recordPayment} style={{
                    padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    background: 'var(--success)', color: 'white', flexShrink: 0,
                  }}>{t('record')}</button>
                </div>
              </div>
            )}

            <div style={{ overflowY: 'auto', padding: '8px 0' }}>
              {detailSales.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-500)', fontSize: 13 }}>{t('noTransactions')}</div>
              ) : detailSales.map(s => {
                const bal = saleBalance(s)
                return (
                  <div key={s.id} style={{ padding: '12px 24px', borderBottom: '1px solid var(--outline)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {s.date}{s.time ? ` · ${s.time}` : ''}
                        <code style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>{saleRef(s)}</code>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-900)', marginTop: 2 }}>{itemsSummary(s)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-500)', marginTop: 2 }}>
                        {fmt(salePaid(s))} {t('paidLower')}
                        {bal > 0 ? ` · ${fmt(bal)} ${t('dueLower')}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>{fmt(s.total)}</span>
                      <StatusBadge status={salePaymentStatus(s)} t={t} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Link past sales (existing customer) */}
      {linkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 460, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>{t('linkPastSale')}</h2>
              <button onClick={() => setLinkModal(null)} style={{ color: 'var(--text-500)', padding: 4 }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-500)', marginBottom: 18 }}>{linkModal.name} · {linkModal.code}</p>
            <div style={{ overflowY: 'auto' }}>
              <SaleLinkPicker selectedIds={linkSel} setSelectedIds={setLinkSel} sales={sales} t={t} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, flexShrink: 0 }}>
              <button onClick={() => setLinkModal(null)} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13 }}>{t('cancel')}</button>
              <button onClick={saveLink} disabled={linkSel.length === 0} style={{
                flex: 1, padding: '11px', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13,
                background: linkSel.length === 0 ? 'var(--outline)' : 'var(--primary)',
                color: linkSel.length === 0 ? 'var(--text-500)' : 'white',
              }}>{t('linkSelected')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 400, boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{t('deleteCustomerTitle')}</h2>
            {customerStats(deleteTarget, sales).outstanding > 0 ? (
              <p style={{ fontSize: 14, color: 'var(--danger)', marginBottom: 24 }}>{t('deleteCustomerOwing')}</p>
            ) : (
              <p style={{ fontSize: 14, color: 'var(--text-500)', marginBottom: 24 }}>
                <strong style={{ color: 'var(--text-900)' }}>{deleteTarget.name}</strong> {t('deleteCustomerMsg')}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13 }}>{t('cancel')}</button>
              <button onClick={confirmDelete} disabled={customerStats(deleteTarget, sales).outstanding > 0} style={{
                flex: 1, padding: '11px', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13,
                background: customerStats(deleteTarget, sales).outstanding > 0 ? 'var(--outline)' : 'var(--danger)',
                color: customerStats(deleteTarget, sales).outstanding > 0 ? 'var(--text-500)' : 'white',
              }}>{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
