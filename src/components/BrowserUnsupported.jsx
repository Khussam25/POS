import { getBrowserUnsupportedCopy } from '../utils/browserSupport'

export default function BrowserUnsupported({ issue }) {
  const { title, body, hint } = getBrowserUnsupportedCopy(issue)

  return (
    <div style={{
      minHeight: '100vh', margin: 0, padding: '32px 24px',
      fontFamily: 'system-ui, Segoe UI, sans-serif',
      background: '#EEF2F7', color: '#1A2332',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxSizing: 'border-box',
    }}>
      <div style={{
        maxWidth: 420, width: '100%', background: '#fff',
        borderRadius: 12, padding: '28px 24px',
        border: '1px solid #D8DEE8',
        boxShadow: '0 8px 24px rgba(26,35,50,0.08)',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px' }}>{title}</h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, margin: '0 0 12px', color: '#5A6B7D' }}>{body}</p>
        <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, fontWeight: 600, color: '#1E4E8C' }}>{hint}</p>
      </div>
    </div>
  )
}
