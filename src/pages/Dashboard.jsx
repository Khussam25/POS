import { useNavigate } from 'react-router-dom'
import { useApp, canAccess } from '../App'
import { useT } from '../i18n/LangContext'
import { ShoppingBag, Plus, ShoppingCart, BarChart2, AlertTriangle, AlertCircle, ArrowRight, Circle } from 'lucide-react'
import { fmtMoney, collectPaymentEvents } from '../utils/money'

const fmt = fmtMoney

function StatCard({ label, value, sub, subColor }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '20px 22px',
      boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)', flex: 1, minWidth: 0
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-900)', marginBottom: 8, letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <span style={{
        display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px',
        borderRadius: 999, background: subColor + '18', color: subColor
      }}>{sub}</span>}
    </div>
  )
}

export default function Dashboard() {
  const { currentUser, data } = useApp()
  const navigate = useNavigate()
  const t = useT()
  const isAdmin = currentUser.role === 'Admin'
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? t('goodMorning') : hour < 17 ? t('goodAfternoon') : t('goodEvening')
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Cash basis: revenue/profit are recognized when payment is received (by
  // payment date), so unpaid credit is excluded until the customer pays.
  const currentMonth = today.slice(0, 7)
  const events = collectPaymentEvents(data.sales, data.products)
  const todayEvents = events.filter(e => e.date === today)
  const monthEvents = events.filter(e => e.date.startsWith(currentMonth))

  const todaySales = data.sales.filter(s => s.date === today)
  const todayRevenue = todayEvents.reduce((a, e) => a + e.collected, 0)

  const monthRevenue = monthEvents.reduce((a, e) => a + e.collected, 0)
  const monthExpenses = data.expenses.filter(e => e.date.startsWith(currentMonth)).reduce((a, e) => a + e.amount, 0)
  const monthGross = monthEvents.reduce((a, e) => a + e.revenue - e.cogs, 0)
  const monthProfit = monthGross - monthExpenses

  const todayExpenses = data.expenses.filter(e => e.date === today).reduce((a, e) => a + e.amount, 0)

  const todayProfit = todayEvents.reduce((a, e) => a + e.revenue - e.cogs, 0) - todayExpenses

  const stockValue = data.products.reduce((a, p) => a + p.sellingPriceTZS * p.qty, 0)

  const lowStock = data.products.filter(p => p.qty > 0 && p.qty <= p.lowStockThreshold)
  const outOfStock = data.products.filter(p => p.qty === 0)
  const lowStockAlerts = [...outOfStock, ...lowStock]

  return (
    <div className="r-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{greeting}, {currentUser.name.split(' ')[0]}</h1>
          <p style={{ color: 'var(--text-500)', fontSize: 13 }}>{dateStr} · Dar es Salaam</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--success-light)', color: 'var(--success)', padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
          <Circle size={8} fill="currentColor" />
          {t('shopOpen')}
        </div>
      </div>

      {/* Stat cards */}
      <div className="r-stats">
        <StatCard label={t('todaySales')} value={fmt(todayRevenue)} sub={`${todaySales.length} ${todaySales.length !== 1 ? t('transactions') : t('transaction')}`} subColor="#1E4E8C" />
        {isAdmin && <StatCard label={t('todayProfit')} value={fmt(todayProfit)} sub={t('afterExpenses')} subColor={todayProfit >= 0 ? '#1A9E6B' : 'var(--danger)'} />}
        {isAdmin && <StatCard label={t('todayExpenses')} value={fmt(todayExpenses)} sub={`${data.expenses.filter(e => e.date === today).length} ${t('expenseRecorded')}`} subColor="#E07B20" />}
        <StatCard label={t('stockValue')} value={fmt(stockValue)} sub={t('allProducts')} subColor="#7A8694" />
      </div>

      {/* Quick Actions */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '20px 22px', marginBottom: 24, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{t('quickActions')}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/pos')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'white', fontWeight: 600, fontSize: 13, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
            <ShoppingCart size={15} /> {t('newSale')}
          </button>
          {isAdmin && (
            <button onClick={() => navigate('/inventory')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--outline)', color: 'var(--text-900)', fontWeight: 600, fontSize: 13, transition: 'all 0.15s', background: 'transparent' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-900)' }}>
              <Plus size={15} /> {t('addProduct')}
            </button>
          )}
          {isAdmin && (
            <button onClick={() => navigate('/expenses')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--outline)', color: 'var(--text-900)', fontWeight: 600, fontSize: 13, transition: 'all 0.15s', background: 'transparent' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-900)' }}>
              <Plus size={15} /> {t('addExpense')}
            </button>
          )}
          {isAdmin && (
            <button onClick={() => navigate('/reports')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--outline)', color: 'var(--text-900)', fontWeight: 600, fontSize: 13, transition: 'all 0.15s', background: 'transparent' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-900)' }}>
              <BarChart2 size={15} /> {t('financialStatement')}
            </button>
          )}
        </div>
      </div>

      {/* Recent Sales + Low Stock */}
      <div className="r-two-col">
        {/* Recent Sales */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{t('recentSales')}</div>
            <button onClick={() => navigate(canAccess(currentUser.role, '/sales') ? '/sales' : '/pos')} style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              {t('viewAll')} <ArrowRight size={13} />
            </button>
          </div>
          <div>
            {todaySales.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-500)', fontSize: 13 }}>{t('noSalesToday')}</div>}
            {todaySales.slice().reverse().map(sale => (
              <div key={sale.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--outline)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShoppingBag size={16} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{sale.customer}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-500)' }}>{sale.items.length} {sale.items.length !== 1 ? t('items') : t('item')} · {sale.time}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(sale.total)}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: sale.paymentMethod === 'Cash' ? 'var(--success-light)' : sale.paymentMethod === 'Card' ? 'var(--primary-light)' : 'rgba(224,123,32,0.1)', color: sale.paymentMethod === 'Cash' ? 'var(--success)' : sale.paymentMethod === 'Card' ? 'var(--primary)' : 'var(--warning)' }}>{sale.paymentMethod}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{t('lowStockAlerts')}</div>
            {lowStockAlerts.length > 0 && <span style={{ background: 'var(--accent)', color: 'white', borderRadius: 999, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{lowStockAlerts.length}</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
            {lowStockAlerts.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--success)', fontSize: 13, fontWeight: 500 }}>{t('wellStocked')}</div>}
            {lowStockAlerts.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {p.qty === 0 ? <AlertCircle size={16} color="var(--danger)" /> : <AlertTriangle size={16} color="var(--warning)" />}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: p.qty === 0 ? 'var(--danger)' : 'var(--warning)' }}>
                    {p.qty === 0 ? t('outOfStock') : `${p.qty} units left`}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/inventory')} style={{ display: 'block', width: '100%', marginTop: 16, padding: '9px', border: '1.5px solid var(--outline)', borderRadius: 8, color: 'var(--text-500)', fontSize: 12, fontWeight: 600, textAlign: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-500)' }}>
            {t('manageInventory')}
          </button>
        </div>
      </div>

      {/* Monthly Summary */}
      {isAdmin && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
            {t('monthlySummary')} — {now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <div className="r-three-col">
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-500)', marginBottom: 6 }}>{t('totalRevenue')}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>{fmt(monthRevenue)}</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-500)', marginBottom: 6 }}>{t('totalExpenses')}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--warning)', letterSpacing: '-0.02em' }}>{fmt(monthExpenses)}</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-500)', marginBottom: 6 }}>{t('netProfit')}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: monthProfit >= 0 ? 'var(--success)' : 'var(--danger)', letterSpacing: '-0.02em' }}>
                {monthProfit < 0 ? '- ' : ''}{fmt(Math.abs(monthProfit))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
