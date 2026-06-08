import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useApp, canAccess } from '../App'
import { useLayoutMode } from '../hooks/useIsCompact'
import { useT, useLang } from '../i18n/LangContext'
import {
  LayoutDashboard, ShoppingCart, Package, Receipt, History,
  BarChart2, Users, Contact, Settings, LogOut, Menu, X
} from 'lucide-react'

function LangToggle() {
  const { lang, toggleLang } = useLang()
  return (
    <button type="button" onClick={toggleLang} className="app-lang-toggle" style={{
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
    <NavLink
      key={to}
      to={to}
      end={end}
      onClick={onNavigate}
      className="app-nav-link"
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
        borderRadius: 10, textDecoration: 'none', fontWeight: 500, fontSize: 14,
        transition: 'background 0.15s, color 0.15s',
        background: isActive ? 'var(--primary-light)' : 'transparent',
        color: isActive ? 'var(--primary)' : 'var(--text-900)',
      })}
    >
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
const NAV_COLLAPSED_KEY = 'jeibe_nav_collapsed_desktop'

export default function Layout() {
  const { currentUser, logout, data, saveError, setSaveError, syncError, setSyncError, lastSyncedAt, syncing, refreshData } = useApp()
  const storeLogo = data.settings.storeLogo || '/Jeibe_Logo.jpg'
  const layoutMode = useLayoutMode()
  const isPhone = layoutMode === 'phone'
  const isTablet = layoutMode === 'tablet'
  const isDesktop = layoutMode === 'desktop'
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [navCollapsed, setNavCollapsed] = useState(() => {
    if (!isDesktop) return false
    try { return localStorage.getItem(NAV_COLLAPSED_KEY) === '1' } catch { return false }
  })
  const t = useT()
  const isPosRoute = useLocation().pathname === '/pos'

  useEffect(() => {
    if (!isDesktop) setNavCollapsed(false)
  }, [isDesktop])

  useEffect(() => {
    if (!isPhone) setDrawerOpen(false)
  }, [isPhone])

  function toggleNavCollapsed() {
    setNavCollapsed(c => {
      const next = !c
      if (isDesktop) {
        try { localStorage.setItem(NAV_COLLAPSED_KEY, next ? '1' : '0') } catch { /* ignore */ }
      }
      return next
    })
  }

  const NAV = [
    { to: '/', label: t('dashboard'), icon: LayoutDashboard, end: true },
    { to: '/pos',       label: t('pos'),       icon: ShoppingCart },
    { to: '/customers', label: t('customersTitle'), icon: Contact },
    { to: '/inventory', label: t('inventory'), icon: Package },
    { to: '/expenses',  label: t('expenses'),  icon: Receipt },
    { to: '/sales',     label: t('salesHistory'), icon: History },
    { to: '/reports',   label: t('reports'),   icon: BarChart2 },
    { to: '/employees', label: t('employees'), icon: Users },
    { to: '/settings',  label: t('settings'),  icon: Settings },
  ]

  const visibleNav = NAV.filter(({ to }) => canAccess(currentUser.role, to))
  const storeShortName = (data.settings?.storeName || 'JEIBE').split(' ')[0]
  const showInlineSidebar = (isDesktop || isTablet) && !navCollapsed
  const showCompactHeader = isPhone || isTablet

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

  function SidebarPanel({ sticky = false, showActiveDot = false, dismissible = false, onDismiss, closeOnNavigate = false }) {
    const afterNav = closeOnNavigate && onDismiss ? onDismiss : undefined
    return (
      <aside className={`no-print app-sidebar ${sticky ? 'app-sidebar--sticky' : ''}`}>
        <div className="app-sidebar-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <img src={storeLogo} alt="JEIBE" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{storeShortName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-500)' }}>Original Products USA</div>
            </div>
          </div>
          {dismissible && onDismiss && (
            <button type="button" onClick={onDismiss} className="app-icon-btn" aria-label="Close menu">
              <X size={18} />
            </button>
          )}
        </div>
        <nav className="app-sidebar-nav">
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.08em', padding: '6px 8px 2px', textTransform: 'uppercase' }}>{t('menu')}</div>
          <NavLinks items={visibleNav} onNavigate={afterNav} showActiveDot={showActiveDot} />
        </nav>
        <div className="app-sidebar-foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--bg)', marginBottom: 4 }}>
            <UserAvatar size={32} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-500)' }}>{currentUser.role}</div>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="app-nav-link" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 8, color: 'var(--text-500)', fontSize: 13, fontWeight: 500 }}>
            <LogOut size={16} strokeWidth={1.8} /><span>{t('signOut')}</span>
          </button>
        </div>
      </aside>
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
      <div className="no-print app-build-footer">
        <span>v{APP_BUILD}</span>
        {syncing ? <span>· syncing…</span> : synced ? <span>· synced {synced}</span> : null}
        <button type="button" onClick={() => refreshData()}>Refresh</button>
      </div>
    )
  }

  return (
    <div className={`app-shell app-shell--${layoutMode}`}>
      {isPhone && drawerOpen && (
        <div className="app-drawer-overlay" role="presentation" onClick={() => setDrawerOpen(false)}>
          <div onClick={e => e.stopPropagation()}>
            <SidebarPanel dismissible onDismiss={() => setDrawerOpen(false)} closeOnNavigate />
          </div>
        </div>
      )}

      {showInlineSidebar && (
        <SidebarPanel sticky showActiveDot />
      )}

      <div className={`app-main-column ${isPosRoute ? 'app-main-column--pos' : ''}`}>
        <header className={`no-print app-topbar ${isPhone ? 'app-topbar--phone' : ''}`}>
          {(showCompactHeader || isDesktop) && (
            <button
              type="button"
              className="app-icon-btn"
              onClick={isPhone ? () => setDrawerOpen(true) : toggleNavCollapsed}
              aria-label={isPhone ? 'Open menu' : (navCollapsed ? 'Open menu' : 'Close menu')}
            >
              <Menu size={22} />
            </button>
          )}
          {(isPhone || (isTablet && navCollapsed) || (isDesktop && navCollapsed)) && (
            <>
              <img src={storeLogo} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              <span className="app-topbar-title">{storeShortName}</span>
            </>
          )}
          <div style={{ flex: 1 }} />
          <LangToggle />
          {showCompactHeader && <UserAvatar />}
        </header>

        <main className={`app-main ${isPhone ? 'app-main--phone' : ''} ${isPosRoute ? 'app-main--pos' : ''}`}>
          <StatusBanners />
          <div className="app-outlet">
            <Outlet />
          </div>
          <BuildFooter />
        </main>
      </div>

      {isPhone && (
        <nav className="no-print layout-bottom-nav" aria-label="Main navigation">
          {visibleNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="app-bottom-nav-link"
              style={({ isActive }) => ({
                flex: '0 0 auto', minWidth: 72, minHeight: 52,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '8px 12px', textDecoration: 'none', gap: 4,
                color: isActive ? 'var(--primary)' : 'var(--text-500)',
                borderTop: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                fontSize: 10, fontWeight: 600,
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
                  <span style={{ whiteSpace: 'nowrap' }}>{label.split(' ')[0]}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
