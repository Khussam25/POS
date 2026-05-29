import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { login, data } = useApp()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    const ok = login(identifier.trim(), password)
    if (ok) {
      navigate('/', { replace: true })
    } else {
      setError('Invalid username or password.')
      setLoading(false)
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
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-900)', marginBottom: 4 }}>{data.settings.storeName.split(' ')[0]}</h1>
        <p style={{ color: 'var(--text-500)', fontSize: 13 }}>Original Products From USA</p>
        <div style={{ width: 40, height: 2, background: 'var(--accent)', margin: '12px auto 0', borderRadius: 2 }} />
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        padding: '36px 32px', width: '100%', maxWidth: 400,
        boxShadow: 'var(--shadow)'
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Sign in to your account</h2>
        <p style={{ color: 'var(--text-500)', fontSize: 13, marginBottom: 28 }}>Enter your credentials to continue</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Email or Username</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
              <input
                type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
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

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
              <input
                type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
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
              <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-500)', padding: 4
              }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, marginBottom: 16, fontWeight: 500
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px', borderRadius: 'var(--radius-sm)',
            background: loading ? 'var(--primary-hover)' : 'var(--primary)',
            color: 'white', fontWeight: 700, fontSize: 15, letterSpacing: '0.02em',
            transition: 'background 0.15s', opacity: loading ? 0.85 : 1
          }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-500)', fontSize: 12 }}>
          Having trouble? Contact your administrator
        </p>
      </div>

      <footer style={{ marginTop: 32, color: 'var(--text-500)', fontSize: 12, textAlign: 'center' }}>
        © 2026 JEIBE Original Products · Dar es Salaam, Tanzania
      </footer>
    </div>
  )
}
