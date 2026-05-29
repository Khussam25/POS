import { useState, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getStore, saveStore } from './store'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PointOfSale from './pages/PointOfSale'
import Inventory from './pages/Inventory'
import Expenses from './pages/Expenses'
import FinancialReports from './pages/FinancialReports'
import Employees from './pages/Employees'
import Settings from './pages/Settings'
import './index.css'

export const AppContext = createContext(null)

export function useApp() { return useContext(AppContext) }

const USERS = [
  { id: 'emp1', username: 'rhoda.mutafungwa', password: 'admin123', name: 'Rhoda Mutafungwa', role: 'Admin', initials: 'RM', color: '#C92B36' },
  { id: 'emp2', username: 'rustick.mbilauli', password: 'cashier123', name: 'Rustick Mbilauli', role: 'Cashier', initials: 'RMB', color: '#1E4E8C' },
  { id: 'emp3', username: 'neema.juma', password: 'cashier123', name: 'Neema Juma', role: 'Cashier', initials: 'NJ', color: '#1E4E8C' },
]

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('jeibe_user')) } catch { return null }
  })
  const [data, setData] = useState(() => getStore())

  function updateData(key, value) {
    setData(prev => ({ ...prev, [key]: value }))
    saveStore(key, value)
  }

  function login(usernameOrEmail, password) {
    const user = USERS.find(u =>
      (u.username === usernameOrEmail || u.username + '@jeibe.co.tz' === usernameOrEmail) &&
      u.password === password
    )
    if (!user) return false
    const u = { id: user.id, name: user.name, role: user.role, initials: user.initials, color: user.color }
    setCurrentUser(u)
    sessionStorage.setItem('jeibe_user', JSON.stringify(u))
    return true
  }

  function logout() {
    setCurrentUser(null)
    sessionStorage.removeItem('jeibe_user')
  }

  return (
    <AppContext.Provider value={{ currentUser, data, updateData, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/" element={currentUser ? <Layout /> : <Navigate to="/login" replace />}>
            <Route index element={<Dashboard />} />
            <Route path="pos" element={<PointOfSale />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<FinancialReports />} />
            <Route path="employees" element={<Employees />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  )
}
