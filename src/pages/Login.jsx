import { useState } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase'
import { useApp } from '../App'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'

const REDIRECT_URL = 'https://pos-git-main-khussam-mohameds-projects.vercel.app/login'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  )
}

const FIREBASE_ERRORS = {
  'auth/user-not-found':        'No account found with this email.',
  'auth/wrong-password':        'Incorrect password.',
  'auth/invalid-credential':    'Invalid email or password.',
  'auth/invalid-email':         'Invalid email format.',
  'auth/user-disabled':         'This account has been disabled.',
  'auth/too-many-requests':     'Too many failed attempts. Try again later.',
  'auth/network-request-failed':'Network error. Check your connection.',
  'auth/unauthorized-domain':   'This domain is not authorised. Contact your administrator.',
}

// ─── Forgot Password view ────────────────────────────────────────────────────
function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email.'); return }
    setLoading(true)
    setError('')
    try {
      await sendPasswordResetEmail(auth, email.trim(), {
        url: REDIRECT_URL,   // after reset, Firebase redirects here
        handleCodeInApp: false,
      })
      setSent(true)
    } catch (err) {
      setError(FIREBASE_ERRORS[err.code] || 'Failed to send reset email. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle2 size={28} color="var(--success)" />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Check your email</h3>
        <p style={{ color: 'var(--text-500)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
          A password reset link has been sent to <strong>{email}</strong>. Click the link in the email to set a new password.
        </p>
        <p style={{ color: 'var(--text-500)', fontSize: 12, marginBottom: 20 }}>
          Didn't receive it? Check your spam folder or{' '}
          <button onClick={() => setSent(false)} style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 12 }}>try again</button>.
        </p>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto',
          color: 'var(--primary)', fontWeight: 600, fontSize: 13
        }}>
          <ArrowLeft size={14} /> Back to sign in
        </button>
      </div>
    )
  }

  return (
    <>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-500)', fontSize: 13, fontWeight: 500, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to sign in
      </button>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Reset your password</h2>
      <p style={{ color: 'var(--text-500)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
        Enter the email address linked to your account. We'll send you a reset link.
      </p>
      <form onSubmit={handleReset}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Email address</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
            <input
              type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="you@example.com" autoFocus
              style={{
                width: '100%', padding: '11px 14px 11px 40px',
                border: `1.5px solid ${error ? 'var(--danger)' : 'var(--outline)'}`,
                borderRadius: 'var(--radius-sm)', outline: 'none', fontSize: 14,
                background: 'var(--bg)', transition: 'border-color 0.15s'
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = 'var(--primary)' }}
              onBlur={e => { if (!error) e.target.style.borderColor = 'var(--outline)' }}
            />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6, fontWeight: 500 }}>{error}</p>}
        </div>
        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '13px', borderRadius: 'var(--radius-sm)',
          background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 14,
          opacity: loading ? 0.8 : 1, transition: 'all 0.15s'
        }}>
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>
    </>
  )
}

// ─── Main Login view ─────────────────────────────────────────────────────────
export default function Login() {
  const { login, loginWithGoogle, data, googleError, setGoogleError } = useApp()
  const [view, setView] = useState('login')   // 'login' | 'forgot'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    try {
      const email = identifier.includes('@') ? identifier.trim() : `${identifier.trim()}@jeibe.co.tz`
      await login(email, password)
    } catch (err) {
      setError(FIREBASE_ERRORS[err.code] || 'Sign in failed. Please try again.')
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setGoogleError(null)
    setGoogleLoading(true)
    try {
      await loginWithGoogle()
      // Page redirects to Google — loading state stays true intentionally
    } catch (err) {
      setError(FIREBASE_ERRORS[err.code] || 'Google sign-in failed. Try again.')
      setGoogleLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'linear-gradient(135deg,#1E4E8C,#163d6e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 800, fontSize: 26, margin: '0 auto 16px',
          boxShadow: '0 8px 24px rgba(30,78,140,0.3)'
        }}>J</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-900)', marginBottom: 4 }}>
          {data.settings.storeName.split(' ')[0]}
        </h1>
        <p style={{ color: 'var(--text-500)', fontSize: 13 }}>Original Products From USA</p>
        <div style={{ width: 40, height: 2, background: 'var(--accent)', margin: '12px auto 0', borderRadius: 2 }} />
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        padding: '36px 32px', width: '100%', maxWidth: 400,
        boxShadow: 'var(--shadow)'
      }}>
        {view === 'forgot'
          ? <ForgotPassword onBack={() => { setView('login'); setError('') }} />
          : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Sign in to your account</h2>
              <p style={{ color: 'var(--text-500)', fontSize: 13, marginBottom: 24 }}>Enter your credentials to continue</p>

              {/* Google redirect error (shown after returning from Google) */}
              {googleError && (
                <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16, fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{googleError}</span>
                  <button onClick={() => setGoogleError(null)} style={{ color: 'var(--danger)', padding: '0 0 0 8px', fontSize: 16, lineHeight: 1 }}>×</button>
                </div>
              )}

              {/* Google */}
              <button onClick={handleGoogle} disabled={googleLoading || loading} style={{
                width: '100%', padding: '11px', borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--outline)', background: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontWeight: 600, fontSize: 14, color: 'var(--text-900)',
                marginBottom: 20, transition: 'all 0.15s', opacity: googleLoading ? 0.7 : 1
              }}
                onMouseEnter={e => { if (!googleLoading) e.currentTarget.style.borderColor = 'var(--primary)' }}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--outline)'}>
                {googleLoading
                  ? <div style={{ width: 18, height: 18, border: '2px solid var(--outline)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
                  : <GoogleIcon />}
                {googleLoading ? 'Signing in…' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--outline)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-500)', fontWeight: 500 }}>or sign in with email</span>
                <div style={{ flex: 1, height: 1, background: 'var(--outline)' }} />
              </div>

              <form onSubmit={handleSubmit}>
                {/* Email field */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Email or Username</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
                    <input
                      type="text" value={identifier} onChange={e => { setIdentifier(e.target.value); setError('') }}
                      placeholder="you@jeibe.co.tz"
                      style={{
                        width: '100%', padding: '11px 14px 11px 40px',
                        border: `1.5px solid ${error ? 'var(--danger)' : 'var(--outline)'}`,
                        borderRadius: 'var(--radius-sm)', outline: 'none', fontSize: 14,
                        background: 'var(--bg)', color: 'var(--text-900)', transition: 'border-color 0.15s'
                      }}
                      onFocus={e => { if (!error) e.target.style.borderColor = 'var(--primary)' }}
                      onBlur={e => { if (!error) e.target.style.borderColor = 'var(--outline)' }}
                    />
                  </div>
                </div>

                {/* Password field */}
                <div style={{ marginBottom: 6 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                      placeholder="Enter your password"
                      style={{
                        width: '100%', padding: '11px 40px 11px 40px',
                        border: `1.5px solid ${error ? 'var(--danger)' : 'var(--outline)'}`,
                        borderRadius: 'var(--radius-sm)', outline: 'none', fontSize: 14,
                        background: 'var(--bg)', color: 'var(--text-900)', transition: 'border-color 0.15s'
                      }}
                      onFocus={e => { if (!error) e.target.style.borderColor = 'var(--primary)' }}
                      onBlur={e => { if (!error) e.target.style.borderColor = 'var(--outline)' }}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)', padding: 4 }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Forgot password link */}
                <div style={{ textAlign: 'right', marginBottom: 18 }}>
                  <button type="button" onClick={() => { setView('forgot'); setError('') }} style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || googleLoading} style={{
                  width: '100%', padding: '13px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 15,
                  opacity: loading ? 0.8 : 1, transition: 'all 0.15s'
                }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--primary-hover)' }}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-500)', fontSize: 12 }}>
                Having trouble? Contact your administrator
              </p>
            </>
          )}
      </div>

      <footer style={{ marginTop: 32, color: 'var(--text-500)', fontSize: 12, textAlign: 'center' }}>
        © 2026 JEIBE Original Products · Dar es Salaam, Tanzania
      </footer>
    </div>
  )
}
