import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, background: 'var(--bg, #EEF2F7)', fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <div style={{
            maxWidth: 440, background: 'var(--surface, #fff)', padding: 28, borderRadius: 12,
            border: '1px solid var(--outline, #D8DEE8)', boxShadow: '0 4px 24px rgba(26,35,50,0.08)',
          }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px', color: 'var(--text-900, #1A2332)' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-500, #5A6B7D)', margin: '0 0 20px' }}>
              The app hit an error while loading. Try a hard refresh (Ctrl+Shift+R). If it keeps happening, use Chrome or Edge and check your internet connection.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 18px', background: 'var(--primary, #1E4E8C)', color: 'white',
                borderRadius: 8, fontWeight: 700, fontSize: 13,
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
