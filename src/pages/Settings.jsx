import { useState, useRef } from 'react'
import { useApp } from '../App'
import { useT } from '../i18n/LangContext'
import FormInput from '../components/FormInput'
import FormField from '../components/FormField'
import { formatPhoneDisplay } from '../utils/phone'
import { Store, DollarSign, Receipt, FileText, User, Save, CheckCircle2 } from 'lucide-react'

const DEFAULT_LOGO = '/Jeibe_Logo.jpg'
const MAX_LOGO_BYTES = 2 * 1024 * 1024

function settingsToForm(settings) {
  return {
    ...settings,
    storeLogo: settings.storeLogo ?? DEFAULT_LOGO,
    phone: formatPhoneDisplay(settings.phone ?? ''),
    exchangeRate: settings.exchangeRate != null ? String(settings.exchangeRate) : '',
    vatRate: settings.vatRate != null ? String(settings.vatRate) : '',
  }
}

function settingsToPayload(form) {
  return {
    ...form,
    phone: formatPhoneDisplay(form.phone.trim()),
    exchangeRate: form.exchangeRate === '' ? 0 : +form.exchangeRate,
    vatRate: form.vatRate === '' ? 0 : +form.vatRate,
  }
}

function SettingsToggle({ label, desc, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--outline)' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-500)' }}>{desc}</div>}
      </div>
      <button type="button" onClick={() => onChange(!checked)} style={{
        width: 44, height: 24, borderRadius: 999, transition: 'background 0.2s', position: 'relative',
        background: checked ? 'var(--primary)' : 'var(--outline)',
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 3, transition: 'left 0.2s',
          left: checked ? 23 : 3, boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
        }} />
      </button>
    </div>
  )
}

const SECTIONS = [
  { key: 'store', label: 'Store Information', icon: Store },
  { key: 'currency', label: 'Currency & Exchange', icon: DollarSign },
  { key: 'tax', label: 'Tax Settings', icon: FileText },
  { key: 'receipt', label: 'Receipt Settings', icon: Receipt },
  { key: 'account', label: 'My Account', icon: User },
]

export default function Settings() {
  const { currentUser, data, updateData } = useApp()
  const t = useT()
  const [section, setSection] = useState('store')
  const [form, setForm] = useState(() => settingsToForm(data.settings))
  const [saved, setSaved] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const [logoError, setLogoError] = useState('')
  const logoInputRef = useRef(null)

  function handleSave() {
    const next = settingsToPayload(form)
    updateData('settings', next)
    setForm(settingsToForm(next))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleLogoPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLogoError('')
    if (!file.type.startsWith('image/')) {
      setLogoError(t('logoInvalidType'))
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(t('logoTooLarge'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const storeLogo = reader.result
      const next = settingsToPayload({ ...form, storeLogo })
      setForm(settingsToForm(next))
      updateData('settings', next)
    }
    reader.onerror = () => setLogoError(t('logoInvalidType'))
    reader.readAsDataURL(file)
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

  return (
    <div className="r-page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Settings</h1>
        <p style={{ color: 'var(--text-500)', fontSize: 13 }}>Configure your store preferences</p>
      </div>

      <div className="settings-layout" style={{ display: 'flex', gap: 24 }}>
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
                <FormField layout="row" label="Store Name" desc="Displayed on receipts and reports" value={form.storeName} onChange={v => setForm(f => ({ ...f, storeName: v }))} />
                <FormField layout="row" label="Address" desc="Physical location of the store" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
                <FormField
                  layout="row"
                  label={t('phoneNumber')}
                  phone
                  value={form.phone}
                  onChange={phone => setForm(f => ({ ...f, phone }))}
                  placeholder="+255 712 345 678"
                  inputStyle={{ width: 320, maxWidth: '100%' }}
                />
                <FormField layout="row" label="Email Address" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
                <div style={{ padding: '16px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{t('storeLogo')}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-500)' }}>{t('updateLogoDesc')}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={form.storeLogo || DEFAULT_LOGO} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--outline)' }} />
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoPick}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        style={{ padding: '8px 14px', border: '1.5px solid var(--outline)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-500)', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-500)' }}
                      >
                        {t('updateLogo')}
                      </button>
                    </div>
                  </div>
                  {logoError && (
                    <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8, fontWeight: 500 }}>{logoError}</p>
                  )}
                </div>
              </>
            )}

            {section === 'currency' && (
              <>
                <FormField layout="row" label="Currency Code" desc="Primary display currency" value={form.currency} onChange={v => setForm(f => ({ ...f, currency: v }))} placeholder="TZS" />
                <FormField layout="row" label="USD to TZS Rate" desc="Exchange rate used for buying price conversions" value={form.exchangeRate} onChange={v => setForm(f => ({ ...f, exchangeRate: v }))} numeric />
              </>
            )}

            {section === 'tax' && (
              <>
                <SettingsToggle label="Enable VAT" desc="Apply Value Added Tax to sales" checked={form.vatEnabled} onChange={vatEnabled => setForm(f => ({ ...f, vatEnabled }))} />
                <FormField layout="row" label="VAT Rate (%)" desc="Percentage applied to each sale" value={form.vatRate} onChange={v => setForm(f => ({ ...f, vatRate: v }))} numeric disabled={!form.vatEnabled} placeholder="18" />
              </>
            )}

            {section === 'receipt' && (
              <>
                <FormField layout="row" label="Receipt Header" desc="Text shown at the top of the receipt" value={form.receiptHeader} onChange={v => setForm(f => ({ ...f, receiptHeader: v }))} placeholder="Thank you for shopping!" />
                <FormField layout="row" label="Receipt Footer" desc="Text shown at the bottom of the receipt" value={form.receiptFooter} onChange={v => setForm(f => ({ ...f, receiptFooter: v }))} placeholder="Come again!" />
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
                      <FormInput type="password" value={passwordForm[field]} onChange={e => setPasswordForm(f => ({ ...f, [field]: e.target.value }))} placeholder="••••••••"
                        selectOnFocus={false} />
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
