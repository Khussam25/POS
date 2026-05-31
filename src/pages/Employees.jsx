import { useState, useEffect, useRef } from 'react'
import { useApp } from '../App'
import { useRefreshDataOnMount } from '../hooks/useRefreshData'
import { useT } from '../i18n/LangContext'
import FormField from '../components/FormField'
import { formatPhoneDisplay } from '../utils/phone'
import { Plus, Pencil, Trash2, X, Shield, CreditCard } from 'lucide-react'

const ROLES = ['Admin', 'Cashier', 'Manager']
const EMPTY = { name: '', email: '', role: 'Cashier', phone: '', username: '', status: 'Active' }

function getInitials(name) { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) }
function getColor(role) { return role === 'Admin' ? '#C92B36' : '#1E4E8C' }

export default function Employees() {
  const { currentUser, data, dataRevision, updateData } = useApp()
  const t = useT()
  useRefreshDataOnMount()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const modalRef = useRef(null)

  function confirmDelete() {
    if (!deleteTarget) return
    updateData('employees', data.employees.filter(e => e.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  function openAdd() { setForm(EMPTY); setErrors({}); setModal('add') }
  function openEdit(emp) {
    setForm({
      id: emp.id,
      name: emp.name ?? '',
      email: emp.email ?? '',
      role: emp.role ?? 'Cashier',
      phone: formatPhoneDisplay(emp.phone ?? ''),
      username: emp.username ?? '',
      status: emp.status ?? 'Active',
    })
    setErrors({})
    setModal('edit')
  }

  useEffect(() => {
    if (!modal) return
    const t = setTimeout(() => {
      const el = modalRef.current?.querySelector('input')
      el?.focus()
    }, 0)
    return () => clearTimeout(t)
  }, [modal])

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Invalid email'
    if (!form.username.trim()) e.username = 'Required'
    if (!form.phone.trim()) e.phone = 'Required'
    if (modal === 'add' && !form.password) e.password = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function save() {
    if (!validate()) return
    if (modal === 'add') {
      const exists = data.employees.some(e => e.username === form.username.trim())
      if (exists) { setErrors(e => ({ ...e, username: 'Username taken' })); return }
      const emailTaken = data.employees.some(e => e.email?.toLowerCase() === form.email.trim().toLowerCase())
      if (emailTaken) { setErrors(e => ({ ...e, email: 'Email taken' })); return }
      const emp = { id: 'emp' + Date.now(), name: form.name.trim(), email: form.email.trim().toLowerCase(), role: form.role, phone: form.phone.trim(), username: form.username.trim(), status: form.status, initials: getInitials(form.name), color: getColor(form.role) }
      updateData('employees', [...data.employees, emp])
    } else {
      updateData('employees', data.employees.map(e => e.id === form.id ? {
        ...e,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        phone: form.phone.trim(),
        username: form.username.trim(),
        status: form.status,
        initials: getInitials(form.name.trim()),
        color: getColor(form.role),
      } : e))
    }
    setModal(null)
  }

  return (
    <div className="r-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{t('employeesTitle')}</h1>
          <p style={{ color: 'var(--text-500)', fontSize: 13 }}>{data.employees.length} {t('teamMembers')}</p>
        </div>
        {currentUser.role === 'Admin' && (
          <button onClick={openAdd} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13
          }}><Plus size={15} /> {t('addEmployee')}</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 20 }}>
        {[...data.employees]
          .sort((a, b) => {
            const ra = a.name?.toLowerCase().startsWith('rhoda') ? 0 : 1
            const rb = b.name?.toLowerCase().startsWith('rhoda') ? 0 : 1
            return ra - rb
          })
          .map(emp => (
          <div key={`${emp.id}-${dataRevision}`} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '22px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: emp.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                  {emp.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{emp.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    {emp.role === 'Admin' ? <Shield size={12} color="var(--accent)" /> : <CreditCard size={12} color="var(--primary)" />}
                    <span style={{ fontSize: 12, color: emp.role === 'Admin' ? 'var(--accent)' : 'var(--primary)', fontWeight: 600 }}>{emp.role}</span>
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                background: emp.status === 'Active' ? 'var(--success-light)' : 'var(--outline)',
                color: emp.status === 'Active' ? 'var(--success)' : 'var(--text-500)'
              }}>{emp.status === 'Active' ? t('active') : t('inactive')}</span>
            </div>

            <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-500)' }}>{t('phone')}</span>
                <span style={{ fontWeight: 500 }}>{formatPhoneDisplay(emp.phone) || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, alignItems: 'center' }}>
                <span style={{ color: 'var(--text-500)' }}>{t('username')}</span>
                <code style={{ fontSize: 12, background: 'var(--bg)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--outline)' }}>{emp.username}</code>
              </div>
            </div>

            {currentUser.role === 'Admin' && (
              <div style={{ display: 'flex', gap: 8, paddingTop: 14, borderTop: '1px solid var(--outline)' }}>
                <button onClick={() => openEdit(emp)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px', border: '1.5px solid var(--outline)', borderRadius: 8, fontSize: 12, fontWeight: 600, transition: 'all 0.15s', color: 'var(--text-900)'
                }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-900)' }}>
                  <Pencil size={13} /> {t('edit')}
                </button>
                {emp.id !== currentUser.id && (
                  <button onClick={() => setDeleteTarget(emp)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px', border: '1.5px solid var(--outline)', borderRadius: 8, fontSize: 12, fontWeight: 600, transition: 'all 0.15s', color: 'var(--text-900)'
                  }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-900)' }}>
                    <Trash2 size={13} /> {t('delete')}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div ref={modalRef} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 440, boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>{modal === 'add' ? t('addEmployee') : t('editEmployee')}</h2>
              <button onClick={() => setModal(null)} style={{ color: 'var(--text-500)', padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <FormField label={t('fullName')} value={form.name} onChange={name => setForm(f => ({ ...f, name }))} error={errors.name} placeholder="e.g. Amina Hassan" />
              <FormField label={t('username')} value={form.username} onChange={username => setForm(f => ({ ...f, username }))} error={errors.username} placeholder="e.g. amina.hassan" />
              <FormField label={t('emailAddressLabel')} type="email" value={form.email} onChange={email => setForm(f => ({ ...f, email }))} error={errors.email} placeholder={t('emailPlaceholder')} />
              <FormField label={t('phone')} phone value={form.phone} onChange={phone => setForm(f => ({ ...f, phone }))} error={errors.phone} placeholder="+255 712 345 678" />
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t('role')}</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--outline)', borderRadius: 8, outline: 'none', fontSize: 13, background: 'var(--bg)' }}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{t('status')}</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--outline)', borderRadius: 8, outline: 'none', fontSize: 13, background: 'var(--bg)' }}>
                  <option value="Active">{t('active')}</option>
                  <option value="Inactive">{t('inactive')}</option>
                </select>
              </div>
              {modal === 'add' && (
                <FormField label={t('password')} type="password" value={form.password ?? ''} onChange={password => setForm(f => ({ ...f, password }))} error={errors.password} placeholder={t('initialPassword')} />
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13 }}>{t('cancel')}</button>
              <button onClick={save} style={{ flex: 1, padding: '11px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}>
                {modal === 'add' ? t('addEmployee') : t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 400, boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{t('deleteUserTitle')}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-500)', marginBottom: 24 }}>
              <strong style={{ color: 'var(--text-900)' }}>{deleteTarget.name}</strong> {t('deleteUserMsg')}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '11px', border: '1.5px solid var(--outline)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 13 }}>{t('cancel')}</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: '11px', background: 'var(--danger)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}>{t('delete')}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
