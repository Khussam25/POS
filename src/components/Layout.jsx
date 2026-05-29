import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useApp, canAccess } from '../App'
import {
  LayoutDashboard, ShoppingCart, Package, Receipt,
  BarChart2, Users, Settings, LogOut
} from 'lucide-react'

const NAV = [
  { to: '/', label: 'Dashboard',         icon: LayoutDashboard, end: true },
  { to: '/pos',       label: 'Point of Sale',    icon: ShoppingCart },
  { to: '/inventory', label: 'Inventory',         icon: Package },
  { to: '/expenses',  label: 'Expenses',           icon: Receipt },
  { to: '/reports',   label: 'Financial Reports',  icon: BarChart2 },
  { to: '/employees', label: 'Employees',           icon: Users },
  { to: '/settings',  label: 'Settings',            icon: Settings },
]

export default function Layout() {
  const { currentUser, logout, data } = useApp()
  const navigate = useNavigate()

  const visibleNav = NAV.filter(({ to }) => canAccess(currentUser.role, to))

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 260, flexShrink: 0, background: 'var(--surface)',
        borderRight: '1px solid var(--outline)', display: 'flex',
        flexDirection: 'column', position: 'sticky', top: 0, height: '100vh'
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--outline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/Jeibe_Logo.jpg" alt="JEIBE" style={{
              width: 40, height: 40, borderRadius: 10,
              objectFit: 'cover', flexShrink: 0,
              boxShadow: 'var(--shadow-sm)'
            }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-900)' }}>{data.settings.storeName.split(' ')[0]}</div>
              <div style={{ fontSize: 11, color: 'var(--text-500)' }}>Original Products USA</div>
            </div>
          </div>
        </div>

        {/* Nav — only shows items the current role can access */}
        <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-500)', letterSpacing: '0.08em', padding: '8px 8px 4px', textTransform: 'uppercase' }}>Menu</div>
          {visibleNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 10, textDecoration: 'none', fontWeight: 500, fontSize: 14,
                transition: 'all 0.15s',
                background: isActive ? 'var(--primary-light)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-900)',
              })}
            >
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

        {/* User footer */}
        <div style={{ borderTop: '1px solid var(--outline)', padding: '12px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 10, background: 'var(--bg)' }}>
            {currentUser.photoURL
              ? <img src={currentUser.photoURL} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: currentUser.color, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 12, flexShrink: 0
                }}>{currentUser.initials}</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-500)' }}>{currentUser.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '9px 12px', borderRadius: 8, color: 'var(--text-500)',
            fontSize: 13, fontWeight: 500, marginTop: 4, transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-light)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-500)'; e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut size={16} strokeWidth={1.8} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  )
}
