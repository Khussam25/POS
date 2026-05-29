import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useApp, canAccess } from '../App'
import { useIsCompact } from '../hooks/useIsCompact'
import { useT, useLang } from '../i18n/LangContext'
import {
  LayoutDashboard, ShoppingCart, Package, Receipt,
  BarChart2, Users, Settings, LogOut, Menu, X
} from 'lucide-react'

function LangToggle() {
  const { lang, toggleLang } = useLang()
  return (
    <button onClick={toggleLang} style={{
      display: 'flex', alignItems: 'center', gap: 1,
      background: 'var(--bg)', border: '1.5px solid var(--outline)',
      borderRadius: 999, overflow: 'hidden', flexShrink: 0
    }}>
      {['en', 'sw'].map(l => (
        <span key={l} style={{
          padding: '4px 10px', fontSize: 11, fontWeight: 700,
          background: lang === l ? 'var(--primary)' : 'transparent',
          color: lang === l ? 'white' : 'var(--text-500)',
          transition: 'all 0.15s', letterSpacing: '0.04em'
        }}>{l === 'en' ? 'EN' : 'SW'}</span>
      ))}
    </button>
  )
}

export default function Layout() {
  const { currentUser, logout, data, saveError, setSaveError } = useApp()
  const storeLogo = data.settings.storeLogo || '/Jeibe_Logo.jpg'
  const isCompact = useIsCompact()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try { return localStorage.getItem('jeibe_nav_collapsed') === '1' } catch { return false }
  })
  const t = useT()

  function toggleNavCollapsed() {
    setNavCollapsed(c => {
      const next = !c
      try { localStorage.setItem('jeibe_nav_collapsed', next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  const NAV = [
    { to: '/', label: t('dashboard'), icon: LayoutDashboard, end: true },
    { to: '/pos',       label: t('pos'),       icon: ShoppingCart },
    { to: '/inventory', label: t('inventory'), icon: Package },
    { to: '/expenses',  label: t('expenses'),  icon: Receipt },
    { to: '/reports',   label: t('reports'),   icon: BarChart2 },
    { to: '/employees', label: t('employees'), icon: Users },
    { to: '/settings',  label: t('settings'),  icon: Settings },
  ]

  const visibleNav = NAV.filter(({ to }) => canAccess(currentUser.role, to))

  async function handleLogout() {
    try {
      await logout()
    } catch {
      /* route guard redirects once auth state clears */
    }
  }

  // ── Phone & tablet: drawer + bottom nav ───────────────────────────────────
  if (isCompact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header className="no-print" style={{
          background: 'var(--surface)', borderBottom: '1px solid var(--outline)',
          padding: '12px 16px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50,
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={storeLogo} alt="JEIBE" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
            <span style={{ fontWeight: 800, fontSize: 16, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.settings.storeName.split(' ')[0]}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LangToggle />
            {currentUser.photoURL
              ? <img src={currentUser.photoURL} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{ width: 30, height: 30, borderRadius: '50%', background: currentUser.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{currentUser.initials}</div>
            }
            <button onClick={() => setDrawerOpen(true)} style={{ color: 'var(--text-900)', padding: 4 }}>
              <Menu size={22} />
            </button>
          </div>
        </header>

        {drawerOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,35,50,0.4)' }} onClick={() => setDrawerOpen(false)} />
            <aside className="no-print" style={{ position: 'relative', width: 260, background: 'var(--surface)', display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '4px 0 20px rgba(26,35,50,0.15)' }}>
              <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--outline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={storeLogo} alt="JEIBE" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{data.settings.storeName.split(' ')[0]}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-500)' }}>Original Products USA</div>
                  </div>
                </div>
                <button onClick={() => setDrawerOpen(false)} style={{ color: 'var(--text-500)' }}><X size={18} /></button>
              </div>
              <nav style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.08em', padding: '6px 8px 2px', textTransform: 'uppercase' }}>{t('menu')}</div>
                {visibleNav.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} onClick={() => setDrawerOpen(false)}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
                      borderRadius: 10, textDecoration: 'none', fontWeight: 500, fontSize: 14,
                      background: isActive ? 'var(--primary-light)' : 'transparent',
                      color: isActive ? 'var(--primary)' : 'var(--text-900)',
                    })}>
                    {({ isActive }) => <><Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} /><span style={{ flex: 1 }}>{label}</span></>}
                  </NavLink>
                ))}
              </nav>
              <div style={{ borderTop: '1px solid var(--outline)', padding: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--bg)', marginBottom: 4 }}>
                  {currentUser.photoURL
                    ? <img src={currentUser.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 32, height: 32, borderRadius: '50%', background: currentUser.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{currentUser.initials}</div>
                  }
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-500)' }}>{currentUser.role}</div>
                  </div>
                </div>
                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 8, color: 'var(--text-500)', fontSize: 13, fontWeight: 500, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-light)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-500)'; e.currentTarget.style.background = 'transparent' }}>
                  <LogOut size={16} strokeWidth={1.8} /><span>{t('signOut')}</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        <main style={{ flex: 1, overflow: 'hidden', paddingBottom: 70, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {saveError && (
            <div className="no-print" style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 16px', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <span>{saveError}</span>
              <button type="button" onClick={() => setSaveError(null)} style={{ fontWeight: 700, fontSize: 16, lineHeight: 1 }} aria-label="Dismiss">×</button>
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Outlet />
          </div>
        </main>

        <nav className="no-print" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
          background: 'var(--surface)', borderTop: '1px solid var(--outline)',
          display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          boxShadow: '0 -2px 12px rgba(26,35,50,0.08)',
        }}>
          {visibleNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
              flex: '0 0 auto', minWidth: 68, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '8px 10px', textDecoration: 'none', gap: 3,
              color: isActive ? 'var(--primary)' : 'var(--text-500)',
              borderTop: isActive ? '2px solid var(--primary)' : '2px solid transparent',
              fontSize: 10, fontWeight: 600,
            })}>
              {({ isActive }) => <><Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} /><span style={{ whiteSpace: 'nowrap' }}>{label.split(' ')[0]}</span></>}
            </NavLink>
          ))}
        </nav>
      </div>
    )
  }

  // ── Desktop: collapsible sidebar ────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {!navCollapsed && (
      <aside className="no-print" style={{ width: 260, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--outline)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--outline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <img src={storeLogo} alt="JEIBE" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0, boxShadow: 'var(--shadow-sm)' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.settings.storeName.split(' ')[0]}</div>
                <div style={{ fontSize: 11, color: 'var(--text-500)' }}>Original Products USA</div>
              </div>
            </div>
            <button type="button" onClick={toggleNavCollapsed} title="Hide menu" style={{ color: 'var(--text-500)', padding: 6, flexShrink: 0 }}>
              <X size={18} />
            </button>
          </div>
          <LangToggle />
        </div>

        <nav style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-500)', letterSpacing: '0.08em', padding: '8px 8px 4px', textTransform: 'uppercase' }}>{t('menu')}</div>
          {visibleNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 10, textDecoration: 'none', fontWeight: 500, fontSize: 14,
                transition: 'all 0.15s',
                background: isActive ? 'var(--primary-light)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-900)',
              })}>
              {({ isActive }) => (
                <>
                  <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid var(--outline)', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 10, background: 'var(--bg)' }}>
            {currentUser.photoURL
              ? <img src={currentUser.photoURL} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 34, height: 34, borderRadius: '50%', background: currentUser.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{currentUser.initials}</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-500)' }}>{currentUser.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 8, color: 'var(--text-500)', fontSize: 13, fontWeight: 500, marginTop: 4, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-light)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-500)'; e.currentTarget.style.background = 'transparent' }}>
            <LogOut size={16} strokeWidth={1.8} /><span>{t('signOut')}</span>
          </button>
        </div>
      </aside>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        <header className="no-print" style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
          background: 'var(--surface)', borderBottom: '1px solid var(--outline)', flexShrink: 0,
        }}>
          {navCollapsed && (
            <button type="button" onClick={toggleNavCollapsed} title="Show menu" style={{ color: 'var(--text-900)', padding: 6 }}>
              <Menu size={22} />
            </button>
          )}
          <img src={storeLogo} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.settings.storeName.split(' ')[0]}
          </span>
          <div style={{ marginLeft: 'auto' }}><LangToggle /></div>
        </header>

      <main style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {saveError && (
          <div className="no-print" style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 16px', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span>{saveError}</span>
            <button type="button" onClick={() => setSaveError(null)} style={{ fontWeight: 700, fontSize: 16, lineHeight: 1 }} aria-label="Dismiss">×</button>
          </div>
        )}
        <Outlet />
      </main>
      </div>
    </div>
  )
}
