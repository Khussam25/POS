import { useState } from 'react'
import { useApp } from '../App'
import { Store, DollarSign, Receipt, FileText, User, Save, CheckCircle2 } from 'lucide-react'

const SECTIONS = [
  { key: 'store', label: 'Store Information', icon: Store },
  { key: 'currency', label: 'Currency & Exchange', icon: DollarSign },
  { key: 'tax', label: 'Tax Settings', icon: FileText },
  { key: 'receipt', label: 'Receipt Settings', icon: Receipt },
  { key: 'account', label: 'My Account', icon: User },
]

export default function Settings() {
  const { currentUser, data, updateData } = useApp()
  const [section, setSection] = useState('store')
  const [form, setForm] = useState({ ...data.settings })
  const [saved, setSaved] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  function handleSave() {
    updateData('settings', form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handlePasswordChange() {
    setPwError('')
    if (!passwordForm.current) { setPwError('Enter current password'); return }
    if (!passwordForm.next) { setPwError('Enter new password'); return }
    if (passwordForm.next !== passwordForm.confirm) { setPwError('Passwords do not match'); return }
    if (passwordForm.next.length < 6) { setPwError('Password must be at least 6 characters'); return }
    setPwSaved(true)
    setPasswordForm({ current: '', next: '', confirm: '' })
    setTimeout(() => setPwSaved(false), 2500)
  }

  const Field = ({ label, desc, field, type = 'text', placeholder, disabled }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--outline)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-500)' }}>{desc}</div>}
      </div>
      <input
        type={type} value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        placeholder={placeholder} disabled={disabled}
        style={{
          width: 280, padding: '9px 12px', border: '1.5px solid var(--outline)', borderRadius: 8,
          outline: 'none', fontSize: 13, background: disabled ? 'var(--bg)' : 'var(--surface)',
          color: disabled ? 'var(--text-500)' : 'var(--text-900)', transition: 'border-color 0.15s'
        }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = 'var(--primary)' }}
        onBlur={e => e.target.style.borderColor = 'var(--outline)'}
      />
    </div>
  )

  const Toggle = ({ label, desc, field }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--outline)' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-500)' }}>{desc}</div>}
      </div>
      <button onClick={() => setForm(f => ({ ...f, [field]: !f[field] }))} style={{
        width: 44, height: 24, borderRadius: 999, transition: 'background 0.2s', position: 'relative',
        background: form[field] ? 'var(--primary)' : 'var(--outline)',
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 3, transition: 'left 0.2s',
          left: form[field] ? 23 : 3, boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
        }} />
      </button>
    </div>
  )

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Settings</h1>
        <p style={{ color: 'var(--text-500)', fontSize: 13 }}>Configure your store preferences</p>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Sidebar */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 8, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setSection(key)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, fontSize: 13, fontWeight: 600, textAlign: 'left', transition: 'all 0.15s',
                background: section === key ? 'var(--primary-light)' : 'transparent',
                color: section === key ? 'var(--primary)' : 'var(--text-900)',
              }}>
                <Icon size={15} strokeWidth={section === key ? 2.2 : 1.8} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '24px 28px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 16, borderBottom: '1.5px solid var(--outline)' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800 }}>{SECTIONS.find(s => s.key === section)?.label}</h2>
              {section !== 'account' && (
                <button onClick={handleSave} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
                  background: saved ? 'var(--success)' : 'var(--primary)', color: 'white',
                  borderRadius: 8, fontWeight: 700, fontSize: 13, transition: 'background 0.2s'
                }}>
                  {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
                  {saved ? 'Saved!' : 'Save Changes'}
                </button>
              )}
            </div>

            {section === 'store' && (
              <>
                <Field label="Store Name" desc="Displayed on receipts and reports" field="storeName" />
                <Field label="Address" desc="Physical location of the store" field="address" />
                <Field label="Phone Number" field="phone" />
                <Field label="Email Address" field="email" type="email" />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Store Logo</div>
                    <div style={{ fontSize: 12, color: 'var(--text-500)' }}>Upload a logo to display on receipts</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#1E4E8C,#163d6e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 20 }}>J</div>
                    <button style={{ padding: '8px 14px', border: '1.5px solid var(--outline)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-500)' }}>Upload Logo</button>
                  </div>
                </div>
              </>
            )}

            {section === 'currency' && (
              <>
                <Field label="Currency Code" desc="Primary display currency" field="currency" placeholder="TZS" />
                <Field label="USD to TZS Rate" desc="Exchange rate used for buying price conversions" field="exchangeRate" type="number" />
              </>
            )}

            {section === 'tax' && (
              <>
                <Toggle label="Enable VAT" desc="Apply Value Added Tax to sales" field="vatEnabled" />
                <Field label="VAT Rate (%)" desc="Percentage applied to each sale" field="vatRate" type="number" disabled={!form.vatEnabled} placeholder="18" />
              </>
            )}

            {section === 'receipt' && (
              <>
                <Field label="Receipt Header" desc="Text shown at the top of the receipt" field="receiptHeader" placeholder="Thank you for shopping!" />
                <Field label="Receipt Footer" desc="Text shown at the bottom of the receipt" field="receiptFooter" placeholder="Come again!" />
              </>
            )}

            {section === 'account' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, padding: '16px', background: 'var(--bg)', borderRadius: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: currentUser.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>{currentUser.initials}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{currentUser.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-500)' }}>{currentUser.role}</div>
                  </div>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Change Password</h3>
                {pwSaved && (
                  <div style={{ background: 'var(--success-light)', color: 'var(--success)', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={15} /> Password changed successfully
                  </div>
                )}
                {pwError && (
                  <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500, marginBottom: 16 }}>{pwError}</div>
                )}
                <div style={{ display: 'grid', gap: 12 }}>
                  {[['Current Password', 'current'], ['New Password', 'next'], ['Confirm New Password', 'confirm']].map(([label, field]) => (
                    <div key={field}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</label>
                      <input type="password" value={passwordForm[field]} onChange={e => setPasswordForm(f => ({ ...f, [field]: e.target.value }))} placeholder="••••••••"
                        style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--outline)', borderRadius: 8, outline: 'none', fontSize: 13, background: 'var(--bg)' }}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--outline)'} />
                    </div>
                  ))}
                </div>
                <button onClick={handlePasswordChange} style={{ marginTop: 20, padding: '11px 22px', background: 'var(--primary)', color: 'white', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
                  Change Password
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
