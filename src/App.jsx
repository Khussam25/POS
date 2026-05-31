import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import { getStore, saveStore, saveStoreBatch } from './store'
import {
  startCloudSync, scheduleCloudPush, pushCloudBatch, isApplyingCloudRemote,
  pullCloudStore, persistLocal,
} from './sync/cloudSync'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PointOfSale from './pages/PointOfSale'
import Inventory from './pages/Inventory'
import Expenses from './pages/Expenses'
import FinancialReports from './pages/FinancialReports'
import Sales from './pages/Sales'
import Employees from './pages/Employees'
import Settings from './pages/Settings'
import { LangProvider } from './i18n/LangContext'
import './index.css'

export const AppContext = createContext(null)
export function useApp() { return useContext(AppContext) }

// Define which roles can access each route
export const PERMISSIONS = {
  '/pos':        ['Admin', 'Cashier'],
  '/inventory':  ['Admin', 'Cashier'],
  '/expenses':   ['Admin'],
  '/sales':      ['Admin'],
  '/reports':    ['Admin'],
  '/employees':  ['Admin'],
  '/settings':   ['Admin', 'Cashier'],
  // '/' dashboard is open to all authenticated users
}

export function canAccess(role, path) {
  if (!PERMISSIONS[path]) return true   // no restriction = all roles allowed
  return PERMISSIONS[path].includes(role)
}

function ProtectedRoute({ path, children }) {
  const { currentUser } = useApp()
  if (!canAccess(currentUser?.role, path)) {
    return <Navigate to="/" replace />
  }
  return children
}

function resolveEmployee(firebaseUser) {
  if (!firebaseUser?.email) return null
  const { employees } = getStore()
  const email = firebaseUser.email.toLowerCase()
  const emp = employees.find(e => e.email?.toLowerCase() === email)
  if (!emp || emp.status === 'Inactive') return null
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
  const [googleError, setGoogleError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [syncError, setSyncError] = useState(null)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [data, setData] = useState(() => getStore())
  const [dataRevision, setDataRevision] = useState(0)
  const syncStarted = useRef(false)

  function refreshCurrentUserFromStore() {
    const fb = auth.currentUser
    if (!fb) return
    const user = resolveEmployee(fb)
    if (user) setCurrentUser(user)
  }

  const applyStoreFromRemote = useCallback((store) => {
    setData({
      products: store.products,
      sales: store.sales,
      expenses: store.expenses,
      employees: store.employees,
      settings: store.settings,
    })
    setDataRevision(r => r + 1)
    refreshCurrentUserFromStore()
  }, [])

  const reloadLocalStore = useCallback(() => {
    applyStoreFromRemote(getStore())
  }, [applyStoreFromRemote])

  const refreshData = useCallback(async () => {
    setSyncing(true)
    try {
      const { store, error } = await pullCloudStore()
      if (error) {
        setSyncError(error)
        return false
      }
      setSyncError(null)
      if (store) {
        persistLocal(store)
        applyStoreFromRemote(store)
        setLastSyncedAt(Date.now())
        return true
      }
      reloadLocalStore()
      setLastSyncedAt(Date.now())
      return true
    } finally {
      setSyncing(false)
    }
  }, [applyStoreFromRemote, reloadLocalStore])

  useEffect(() => {
    let cancelled = false
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return
      if (firebaseUser) {
        const user = resolveEmployee(firebaseUser)
        if (user) {
          setCurrentUser(user)
          setGoogleError(null)
        } else {
          try {
            await signOut(auth)
          } catch { /* ignore */ }
          if (!cancelled) {
            setCurrentUser(null)
            setGoogleError('This account is not registered as an active employee. Contact your administrator.')
          }
        }
      } else {
        setCurrentUser(null)
      }
      if (!cancelled) setAuthLoading(false)
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  useEffect(() => {
    function onStorage(e) {
      if (!e.key?.startsWith('jeibe_') || e.key === 'jeibe_version' || e.key === 'jeibe_lang') return
      refreshData()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refreshData])

  useEffect(() => {
    let focusTimer
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      clearTimeout(focusTimer)
      focusTimer = setTimeout(() => refreshData(), 400)
    }
    function onFocus() {
      clearTimeout(focusTimer)
      focusTimer = setTimeout(() => refreshData(), 400)
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [refreshData])

  useEffect(() => {
    if (!currentUser) return
    refreshData()
  }, [currentUser?.id, refreshData])

  useEffect(() => {
    if (!currentUser) {
      syncStarted.current = false
      setSyncError(null)
      return
    }
    if (syncStarted.current) return
    syncStarted.current = true
    const stop = startCloudSync({
      onRemoteUpdate: applyStoreFromRemote,
      onSyncError: setSyncError,
      onSyncOk: () => {
        setSyncError(null)
        setLastSyncedAt(Date.now())
      },
    })
    return () => {
      syncStarted.current = false
      stop()
    }
  }, [currentUser?.id, applyStoreFromRemote])

  function updateData(key, value) {
    if (!saveStore(key, value)) {
      setSaveError('Could not save your changes. Storage may be full — try a smaller store logo.')
      return false
    }
    setSaveError(null)
    setData(prev => ({ ...prev, [key]: value }))
    if (!isApplyingCloudRemote()) scheduleCloudPush({ [key]: value })
    return true
  }

  function batchUpdateData(updates) {
    if (!saveStoreBatch(updates)) {
      setSaveError('Could not save your changes. Storage may be full — try a smaller store logo.')
      return false
    }
    setSaveError(null)
    setData(prev => ({ ...prev, ...updates }))
    if (!isApplyingCloudRemote()) pushCloudBatch(updates)
    return true
  }

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function loginWithGoogle() {
    setGoogleError(null)
    await signInWithPopup(auth, googleProvider)
  }

  async function logout() {
    await signOut(auth)
    setCurrentUser(null)
    setGoogleError(null)
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
    <LangProvider>
    <AppContext.Provider value={{
      currentUser, data, dataRevision, updateData, batchUpdateData, refreshData,
      login, loginWithGoogle, logout, googleError, setGoogleError, saveError, setSaveError,
      syncError, setSyncError, lastSyncedAt, syncing,
    }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/" element={currentUser ? <Layout /> : <Navigate to="/login" replace />}>
            <Route index element={<Dashboard />} />
            <Route path="pos" element={
              <ProtectedRoute path="/pos"><PointOfSale /></ProtectedRoute>
            } />
            <Route path="inventory" element={
              <ProtectedRoute path="/inventory"><Inventory /></ProtectedRoute>
            } />
            <Route path="expenses" element={
              <ProtectedRoute path="/expenses"><Expenses /></ProtectedRoute>
            } />
            <Route path="sales" element={
              <ProtectedRoute path="/sales"><Sales /></ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute path="/reports"><FinancialReports /></ProtectedRoute>
            } />
            <Route path="employees" element={
              <ProtectedRoute path="/employees"><Employees /></ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute path="/settings"><Settings /></ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
    </LangProvider>
  )
}
