import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth'
import { auth, googleProvider } from './firebase'
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

function resolveEmployee(firebaseUser) {
  if (!firebaseUser) return null
  const { employees } = getStore()
  const emp = employees.find(e => e.email === firebaseUser.email)
  if (!emp) return null
  return {
    id: emp.id,
    name: emp.name,
    role: emp.role,
    initials: emp.initials,
    color: emp.color,
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL || null,
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [data, setData] = useState(() => getStore())

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = resolveEmployee(firebaseUser)
        if (user) {
          setCurrentUser(user)
        } else {
          await signOut(auth)
          setCurrentUser(null)
        }
      } else {
        setCurrentUser(null)
      }
      setAuthLoading(false)
    })
    return unsub
  }, [])

  function updateData(key, value) {
    setData(prev => ({ ...prev, [key]: value }))
    saveStore(key, value)
  }

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function loginWithGoogle() {
    await signInWithPopup(auth, googleProvider)
  }

  async function logout() {
    await signOut(auth)
    setCurrentUser(null)
  }

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44,
            border: '3px solid var(--primary-light)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.75s linear infinite',
            margin: '0 auto 14px'
          }} />
          <p style={{ color: 'var(--text-500)', fontSize: 13 }}>Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <AppContext.Provider value={{ currentUser, data, updateData, login, loginWithGoogle, logout }}>
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
