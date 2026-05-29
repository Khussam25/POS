import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useApp, canAccess } from '../App'
import { useIsPhone, useIsTablet } from '../hooks/useIsCompact'
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

function NavLinks({ items, onNavigate, showActiveDot }) {
  return items.map(({ to, label, icon: Icon, end }) => (
    <NavLink key={to} to={to} end={end} onClick={onNavigate}
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
          {showActiveDot && isActive && (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
          )}
        </>
      )}
    </NavLink>
  ))
}

const APP_BUILD = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : 'dev'

export default function Layout() {
  const { currentUser, logout, data, saveError, setSaveError, syncError, setSyncError, lastSyncedAt, syncing, refreshData } = useApp()
  const storeLogo = data.settings.storeLogo || '/Jeibe_Logo.jpg'
  const isPhone = useIsPhone()
  const isTablet = useIsTablet()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('jeibe_nav_collapsed')
      if (saved !== null) return saved === '1'
    } catch { /* ignore */ }
    return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  })
  const t = useT()

  useEffect(() => {
    if (isTablet) setNavCollapsed(true)
  }, [isTablet])

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
  const storeShortName = data.settings.storeName.split(' ')[0]

  async function handleLogout() {
    try {
      await logout()
    } catch {
      /* route guard redirects once auth state clears */
    }
  }

  function UserAvatar({ size = 30 }) {
    if (currentUser.photoURL) {
      return <img src={currentUser.photoURL} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
    }
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', background: currentUser.color, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size < 34 ? 11 : 12,
      }}>{currentUser.initials}</div>
    )
  }

  function SidebarPanel({ onClose, width = 260, sticky = false, showActiveDot = false }) {
    return (
      <aside className="no-print" style={{
        width, flexShrink: 0, background: 'var(--surface)',
        borderRight: '1px solid var(--outline)', display: 'flex', flexDirection: 'column',
        ...(sticky ? { position: 'sticky', top: 0, height: '100vh' } : { height: '100%' }),
        boxShadow: sticky ? undefined : '4px 0 20px rgba(26,35,50,0.15)',
      }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--outline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <img src={storeLogo} alt="JEIBE" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{storeShortName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-500)' }}>Original Products USA</div>
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} style={{ color: 'var(--text-500)', padding: 4, flexShrink: 0 }} aria-label="Close menu">
              <X size={18} />
            </button>
          )}
        </div>
        <nav style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.08em', padding: '6px 8px 2px', textTransform: 'uppercase' }}>{t('menu')}</div>
          <NavLinks items={visibleNav} onNavigate={onClose} showActiveDot={sticky} />
        </nav>
        <div style={{ borderTop: '1px solid var(--outline)', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--bg)', marginBottom: 4 }}>
            <UserAvatar size={32} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-500)' }}>{currentUser.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 8, color: 'var(--text-500)', fontSize: 13, fontWeight: 500 }}>
            <LogOut size={16} strokeWidth={1.8} /><span>{t('signOut')}</span>
          </button>
        </div>
      </aside>
    )
  }

  function TopBar({ showNavToggle, onNavToggle, navOpen }) {
    return (
      <header className="no-print" style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: isPhone ? '12px 16px' : '10px 16px',
        background: 'var(--surface)', borderBottom: '1px solid var(--outline)', flexShrink: 0,
        position: isPhone ? 'sticky' : undefined, top: isPhone ? 0 : undefined, zIndex: isPhone ? 50 : undefined,
        boxShadow: isPhone ? 'var(--shadow-sm)' : undefined,
      }}>
        {showNavToggle && (
          <button
            type="button"
            onClick={onNavToggle}
            style={{ color: 'var(--text-900)', padding: 6, flexShrink: 0, marginRight: 2 }}
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
          >
            {navOpen && isTablet ? <X size={22} /> : <Menu size={22} />}
          </button>
        )}
        <img src={storeLogo} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
        <span style={{ fontWeight: 800, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
          {storeShortName}
        </span>
        <LangToggle />
        <UserAvatar />
      </header>
    )
  }

  function StatusBanners() {
    return (
      <>
        {syncError && (
          <div className="no-print" style={{ background: '#fef3c7', color: '#92400e', padding: '10px 16px', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexShrink: 0 }}>
            <span>{syncError}</span>
            <button type="button" onClick={() => setSyncError(null)} style={{ fontWeight: 700, fontSize: 16, lineHeight: 1, flexShrink: 0 }} aria-label="Dismiss">×</button>
          </div>
        )}
        {saveError && (
          <div className="no-print" style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 16px', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <span>{saveError}</span>
            <button type="button" onClick={() => setSaveError(null)} style={{ fontWeight: 700, fontSize: 16, lineHeight: 1 }} aria-label="Dismiss">×</button>
          </div>
        )}
      </>
    )
  }

  function BuildFooter() {
    const synced = lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : null
    return (
      <div className="no-print" style={{
        padding: '4px 12px', fontSize: 10, color: 'var(--text-500)', textAlign: 'center',
        borderTop: '1px solid var(--outline)', flexShrink: 0, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <span>v{APP_BUILD}</span>
        {syncing ? <span>· syncing…</span> : synced ? <span>· synced {synced}</span> : null}
        <button type="button" onClick={() => refreshData()} style={{ textDecoration: 'underline', color: 'var(--primary)', fontSize: 10 }}>Refresh</button>
      </div>
    )
  }

  function MainContent({ bottomPad = false, showBuildFooter = false }) {
    return (
      <main style={{
        flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0,
        paddingBottom: bottomPad ? 70 : 0,
      }}>
        <StatusBanners />
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </div>
        {showBuildFooter && <BuildFooter />}
      </main>
    )
  }

  // ── Phone: left menu + bottom nav ─────────────────────────────────────────
  if (isPhone) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar showNavToggle onNavToggle={() => setDrawerOpen(true)} navOpen={drawerOpen} />

        {drawerOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
            <SidebarPanel onClose={() => setDrawerOpen(false)} />
            <div style={{ flex: 1 }} onClick={() => setDrawerOpen(false)} aria-hidden />
          </div>
        )}

        <MainContent bottomPad showBuildFooter />

        <nav className="no-print layout-bottom-nav" style={{
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

  // ── Tablet: collapsible left panel, no bottom nav ─────────────────────────
  if (isTablet) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {!navCollapsed && <SidebarPanel onClose={toggleNavCollapsed} sticky />}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
          <TopBar showNavToggle onNavToggle={toggleNavCollapsed} navOpen={!navCollapsed} />
          <MainContent showBuildFooter />
        </div>
      </div>
    )
  }

  // ── Desktop: collapsible sidebar ──────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {!navCollapsed && <SidebarPanel sticky showActiveDot onClose={toggleNavCollapsed} />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        <header className="no-print" style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
          background: 'var(--surface)', borderBottom: '1px solid var(--outline)', flexShrink: 0,
        }}>
          {navCollapsed && (
            <button type="button" onClick={toggleNavCollapsed} style={{ color: 'var(--text-900)', padding: 6, flexShrink: 0 }} aria-label="Open menu">
              <Menu size={22} />
            </button>
          )}
          <img src={storeLogo} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
            {storeShortName}
          </span>
          <LangToggle />
        </header>

        <main style={{ flex: 1, overflow: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <StatusBanners />
          <div style={{ flex: 1, minHeight: 0 }}>
            <Outlet />
          </div>
          <BuildFooter />
        </main>
      </div>
    </div>
  )
}
