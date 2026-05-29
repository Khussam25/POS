import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { ShoppingBag, TrendingUp, Receipt, Package2, Plus, ShoppingCart, BarChart2, AlertTriangle, AlertCircle, ArrowRight, Circle } from 'lucide-react'

function fmt(n) { return 'TZS ' + Number(n).toLocaleString() }

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
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const todaySales = data.sales.filter(s => s.date === today)
  const todayRevenue = todaySales.reduce((a, s) => a + s.total, 0)

  const currentMonth = today.slice(0, 7)
  const monthSales = data.sales.filter(s => s.date.startsWith(currentMonth))
  const monthRevenue = monthSales.reduce((a, s) => a + s.total, 0)
  const monthExpenses = data.expenses.filter(e => e.date.startsWith(currentMonth)).reduce((a, e) => a + e.amount, 0)
  const monthProfit = monthRevenue - monthExpenses

  const todayExpenses = data.expenses.filter(e => e.date === today).reduce((a, e) => a + e.amount, 0)

  const totalCOGS = data.products.reduce((a, p) => {
    const rate = data.settings.exchangeRate || 2450
    return a + p.buyingPriceUSD * rate * p.qty
  }, 0)

  const todayProfit = todaySales.reduce((a, s) => {
    return a + s.items.reduce((ia, item) => {
      const prod = data.products.find(p => p.id === item.productId)
      const cogs = prod ? prod.buyingPriceUSD * (data.settings.exchangeRate || 2450) * item.qty : 0
      return ia + item.price * item.qty - cogs
    }, 0)
  }, 0) - todayExpenses

  const stockValue = data.products.reduce((a, p) => a + p.sellingPriceTZS * p.qty, 0)

  const lowStock = data.products.filter(p => p.qty > 0 && p.qty <= p.lowStockThreshold)
  const outOfStock = data.products.filter(p => p.qty === 0)
  const lowStockAlerts = [...outOfStock, ...lowStock]

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{greeting}, {currentUser.name.split(' ')[0]}</h1>
          <p style={{ color: 'var(--text-500)', fontSize: 13 }}>{dateStr} · Dar es Salaam</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--success-light)', color: 'var(--success)', padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
          <Circle size={8} fill="currentColor" />
          Shop is open
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Today's Sales" value={fmt(todayRevenue)} sub={`${todaySales.length} transaction${todaySales.length !== 1 ? 's' : ''}`} subColor="#1E4E8C" />
        <StatCard label="Today's Profit" value={fmt(Math.max(0, todayProfit))} sub="After expenses" subColor="#1A9E6B" />
        <StatCard label="Today's Expenses" value={fmt(todayExpenses)} sub={`${data.expenses.filter(e => e.date === today).length} expense recorded`} subColor="#E07B20" />
        <StatCard label="Stock Value" value={fmt(stockValue)} sub="All products" subColor="#7A8694" />
      </div>

      {/* Quick Actions */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '20px 22px', marginBottom: 24, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/pos')} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'white',
            fontWeight: 600, fontSize: 13, transition: 'background 0.15s'
          }} onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
            <ShoppingCart size={15} /> New Sale
          </button>
          <button onClick={() => navigate('/inventory')} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--outline)', color: 'var(--text-900)',
            fontWeight: 600, fontSize: 13, transition: 'all 0.15s', background: 'transparent'
          }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-900)' }}>
            <Plus size={15} /> Add Product
          </button>
          <button onClick={() => navigate('/expenses')} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--outline)', color: 'var(--text-900)',
            fontWeight: 600, fontSize: 13, transition: 'all 0.15s', background: 'transparent'
          }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-900)' }}>
            <Plus size={15} /> Add Expense
          </button>
          <button onClick={() => navigate('/reports')} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--outline)', color: 'var(--text-900)',
            fontWeight: 600, fontSize: 13, transition: 'all 0.15s', background: 'transparent'
          }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-900)' }}>
            <BarChart2 size={15} /> Financial Statement
          </button>
        </div>
      </div>

      {/* Recent Sales + Low Stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 24 }}>
        {/* Recent Sales */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Recent Sales</div>
            <button onClick={() => navigate('/pos')} style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div>
            {todaySales.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-500)', fontSize: 13 }}>No sales today yet</div>
            )}
            {todaySales.slice().reverse().map(sale => (
              <div key={sale.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--outline)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShoppingBag size={16} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{sale.customer}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-500)' }}>{sale.items.length} item{sale.items.length !== 1 ? 's' : ''} · {sale.time}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(sale.total)}</div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                    background: sale.paymentMethod === 'Cash' ? 'var(--success-light)' : sale.paymentMethod === 'Card' ? 'var(--primary-light)' : 'rgba(224,123,32,0.1)',
                    color: sale.paymentMethod === 'Cash' ? 'var(--success)' : sale.paymentMethod === 'Card' ? 'var(--primary)' : 'var(--warning)'
                  }}>{sale.paymentMethod}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Low Stock Alerts</div>
            {lowStockAlerts.length > 0 && (
              <span style={{ background: 'var(--accent)', color: 'white', borderRadius: 999, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                {lowStockAlerts.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lowStockAlerts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--success)', fontSize: 13, fontWeight: 500 }}>All products well-stocked</div>
            )}
            {lowStockAlerts.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {p.qty === 0
                  ? <AlertCircle size={16} color="var(--danger)" />
                  : <AlertTriangle size={16} color="var(--warning)" />}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: p.qty === 0 ? 'var(--danger)' : 'var(--warning)' }}>
                    {p.qty === 0 ? 'Out of stock' : `${p.qty} units left`}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/inventory')} style={{
            display: 'block', width: '100%', marginTop: 16, padding: '9px',
            border: '1.5px solid var(--outline)', borderRadius: 8, color: 'var(--text-500)',
            fontSize: 12, fontWeight: 600, textAlign: 'center', transition: 'all 0.15s'
          }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--text-500)' }}>
            Manage Inventory →
          </button>
        </div>
      </div>

      {/* Monthly Summary */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--outline)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
          Monthly Summary — {now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-500)', marginBottom: 6 }}>Total Revenue</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>{fmt(monthRevenue)}</div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-500)', marginBottom: 6 }}>Total Expenses</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--warning)', letterSpacing: '-0.02em' }}>{fmt(monthExpenses)}</div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-500)', marginBottom: 6 }}>Net Profit</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: monthProfit >= 0 ? 'var(--success)' : 'var(--danger)', letterSpacing: '-0.02em' }}>
              {monthProfit < 0 ? '- ' : ''}{fmt(Math.abs(monthProfit))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
