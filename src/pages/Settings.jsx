import { useState, useRef, useEffect } from 'react'
import {
  EmailAuthProvider, linkWithCredential, updatePassword,
  reauthenticateWithCredential, reauthenticateWithPopup,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { useApp } from '../App'
import { useT } from '../i18n/LangContext'
import { useIsCompact } from '../hooks/useIsCompact'
import { useRefreshDataOnMount } from '../hooks/useRefreshData'
import FormInput from '../components/FormInput'
import FormField from '../components/FormField'
import { formatPhoneDisplay } from '../utils/phone'
import { DEFAULT_EXCHANGE_RATE } from '../utils/money'
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
  const rate = form.exchangeRate === '' ? 0 : +form.exchangeRate
  return {
    ...form,
    phone: formatPhoneDisplay(form.phone.trim()),
    exchangeRate: rate > 0 ? rate : DEFAULT_EXCHANGE_RATE,
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
  { key: 'store', labelKey: 'storeInformation', icon: Store },
  { key: 'currency', labelKey: 'currencyExchange', icon: DollarSign },
  { key: 'tax', labelKey: 'taxSettings', icon: FileText },
  { key: 'receipt', labelKey: 'receiptSettings', icon: Receipt },
  { key: 'account', labelKey: 'myAccount', icon: User },
]

export default function Settings() {
  const { currentUser, data, dataRevision, updateData } = useApp()
  const t = useT()
  const isCompact = useIsCompact()
  const fieldLayout = isCompact ? 'stack' : 'row'
  const isAdmin = currentUser.role === 'Admin'
  const sections = isAdmin ? SECTIONS : SECTIONS.filter(s => s.key === 'account')
  const [section, setSection] = useState(isAdmin ? 'store' : 'account')
  const [form, setForm] = useState(() => settingsToForm(data.settings))
  const formDirtyRef = useRef(false)
  const [saved, setSaved] = useState(false)
  const [hasRemoteUpdate, setHasRemoteUpdate] = useState(false)

  useRefreshDataOnMount()

  useEffect(() => {
    const next = settingsToForm(data.settings)
    if (!formDirtyRef.current) {
      setForm(next)
      setHasRemoteUpdate(false)
      return
    }
    const localPayload = JSON.stringify(settingsToPayload(form))
    const remotePayload = JSON.stringify(settingsToPayload(next))
    if (localPayload !== remotePayload) setHasRemoteUpdate(true)
  }, [data.settings, dataRevision])

  function patchForm(updater) {
    formDirtyRef.current = true
    setForm(updater)
  }
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [hasPassword, setHasPassword] = useState(
    () => auth.currentUser?.providerData?.some(p => p.providerId === 'password') ?? false
  )
  const [logoError, setLogoError] = useState('')
  const logoInputRef = useRef(null)

  function handleSave() {
    const next = settingsToPayload(form)
    updateData('settings', next)
    formDirtyRef.current = false
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

  function mapPwError(err) {
    switch (err?.code) {
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Current password is incorrect.'
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.'
      case 'auth/requires-recent-login':
        return 'Please sign out and sign in again, then retry.'
      case 'auth/credential-already-in-use':
      case 'auth/email-already-in-use':
        return 'This email already has a password on another account.'
      case 'auth/popup-blocked':
        return 'Popup blocked. Allow popups for this site, then retry.'
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Verification was cancelled. Please try again.'
      default:
        return 'Could not update password. Please try again.'
    }
  }

  async function handlePasswordChange() {
    setPwError(''); setPwSaved(false)
    const { current, next, confirm } = passwordForm
    if (hasPassword && !current) { setPwError('Enter current password'); return }
    if (!next) { setPwError('Enter new password'); return }
    if (next.length < 6) { setPwError('Password must be at least 6 characters'); return }
    if (next !== confirm) { setPwError('Passwords do not match'); return }

    const user = auth.currentUser
    if (!user?.email) { setPwError('You are not signed in.'); return }

    setPwLoading(true)
    try {
      if (hasPassword) {
        // Existing password account → re-authenticate, then update.
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current))
        await updatePassword(user, next)
      } else {
        // Google-only account → link a password credential to the same account.
        const cred = EmailAuthProvider.credential(user.email, next)
        try {
          await linkWithCredential(user, cred)
        } catch (err) {
          if (err.code === 'auth/requires-recent-login') {
            await reauthenticateWithPopup(user, googleProvider)
            await linkWithCredential(user, cred)
          } else {
            throw err
          }
        }
        setHasPassword(true)
      }
      setPwSaved(true)
      setPasswordForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 4000)
    } catch (err) {
      setPwError(mapPwError(err))
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="r-page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{t('settingsTitle')}</h1>
        <p style={{ color: 'var(--text-500)', fontSize: 13 }}>{t('settingsSub')}</p>
        {hasRemoteUpdate && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--primary-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{t('settingsUpdatedElsewhere')}</span>
            <button type="button" onClick={() => {
              formDirtyRef.current = false
              setForm(settingsToForm(data.settings))
              setHasRemoteUpdate(false)
            }} style={{ padding: '6px 14px', background: 'var(--primary)', color: 'white', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
              {t('loadLatest')}
            </button>
          </div>
        )}
      </div>

      <div className="settings-layout" style={{ display: 'flex', gap: 24 }}>
        {/* Sidebar */}
        <div className="settings-nav" style={{ width: 220, flexShrink: 0 }}>
          <div className="settings-nav-inner" style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 8, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sections.map(({ key, labelKey, icon: Icon }) => (
              <button key={key} onClick={() => setSection(key)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, fontSize: 13, fontWeight: 600, textAlign: 'left', transition: 'all 0.15s',
                background: section === key ? 'var(--primary-light)' : 'transparent',
                color: section === key ? 'var(--primary)' : 'var(--text-900)',
              }}>
                <Icon size={15} strokeWidth={section === key ? 2.2 : 1.8} />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div className="settings-content-card" style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '24px 28px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
            <div className="settings-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8, paddingBottom: 16, borderBottom: '1.5px solid var(--outline)' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800 }}>{t(SECTIONS.find(s => s.key === section)?.labelKey)}</h2>
              {section !== 'account' && (
                <button onClick={handleSave} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
                  background: saved ? 'var(--success)' : 'var(--primary)', color: 'white',
                  borderRadius: 8, fontWeight: 700, fontSize: 13, transition: 'background 0.2s'
                }}>
                  {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
                  {saved ? t('saved') : t('saveChanges')}
                </button>
              )}
            </div>

            {section === 'store' && (
              <>
                <FormField layout={fieldLayout} label={t('storeName')} desc={t('storeNameDesc')} value={form.storeName} onChange={v => patchForm(f => ({ ...f, storeName: v }))} />
                <FormField layout={fieldLayout} label={t('address')} desc={t('addressDesc')} value={form.address} onChange={v => patchForm(f => ({ ...f, address: v }))} />
                <FormField
                  layout={fieldLayout}
                  label={t('phoneNumber')}
                  phone
                  value={form.phone}
                  onChange={phone => patchForm(f => ({ ...f, phone }))}
                  placeholder="+255 712 345 678"
                />
                <FormField layout={fieldLayout} label={t('emailAddressLabel')} type="email" value={form.email} onChange={v => patchForm(f => ({ ...f, email: v }))} />
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
                <FormField layout={fieldLayout} label={t('currencyCode')} desc={t('currencyCodeDesc')} value={form.currency} onChange={v => patchForm(f => ({ ...f, currency: v }))} placeholder="TZS" />
                <FormField layout={fieldLayout} label={t('exchangeRate')} desc={t('exchangeRateDesc')} value={form.exchangeRate} onChange={v => patchForm(f => ({ ...f, exchangeRate: v }))} numeric />
              </>
            )}

            {section === 'tax' && (
              <>
                <SettingsToggle label={t('enableVAT')} desc={t('enableVATDesc')} checked={form.vatEnabled} onChange={vatEnabled => patchForm(f => ({ ...f, vatEnabled }))} />
                <FormField layout={fieldLayout} label={t('vatRate')} desc={t('vatRateDesc')} value={form.vatRate} onChange={v => patchForm(f => ({ ...f, vatRate: v }))} numeric disabled={!form.vatEnabled} placeholder="18" />
              </>
            )}

            {section === 'receipt' && (
              <>
                <FormField layout={fieldLayout} label={t('receiptHeader')} desc={t('receiptHeaderDesc')} value={form.receiptHeader} onChange={v => patchForm(f => ({ ...f, receiptHeader: v }))} placeholder="Thank you for shopping!" />
                <FormField layout={fieldLayout} label={t('receiptFooter')} desc={t('receiptFooterDesc')} value={form.receiptFooter} onChange={v => patchForm(f => ({ ...f, receiptFooter: v }))} placeholder="Come again!" />
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
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: hasPassword ? 16 : 6 }}>{hasPassword ? t('changePassword') : t('setPassword')}</h3>
                {!hasPassword && (
                  <p style={{ fontSize: 13, color: 'var(--text-500)', marginBottom: 16, lineHeight: 1.5 }}>{t('setPasswordDesc')}</p>
                )}
                {pwSaved && (
                  <div style={{ background: 'var(--success-light)', color: 'var(--success)', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={15} /> {hasPassword ? t('passwordChanged') : t('passwordSet')}
                  </div>
                )}
                {pwError && (
                  <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500, marginBottom: 16 }}>{pwError}</div>
                )}
                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    ...(hasPassword ? [[t('currentPassword'), 'current']] : []),
                    [t('newPasswordLabel'), 'next'],
                    [t('confirmPassword'), 'confirm'],
                  ].map(([label, field]) => (
                    <div key={field}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</label>
                      <FormInput type="password" value={passwordForm[field]} onChange={e => setPasswordForm(f => ({ ...f, [field]: e.target.value }))} placeholder="••••••••"
                        selectOnFocus={false} />
                    </div>
                  ))}
                </div>
                <button onClick={handlePasswordChange} disabled={pwLoading} style={{ marginTop: 20, padding: '11px 22px', background: 'var(--primary)', color: 'white', borderRadius: 8, fontWeight: 700, fontSize: 13, opacity: pwLoading ? 0.7 : 1 }}>
                  {pwLoading ? t('signingIn') : (hasPassword ? t('changePassword') : t('setPassword'))}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
