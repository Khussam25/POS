import { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { app } from '../firebase'
import { getStore, saveStore } from '../store'

const STORE_REF = ['stores', 'main']
const SYNC_KEYS = ['products', 'sales', 'customers', 'expenses', 'employees']

const SETTINGS_CLOUD_FIELDS = [
  'storeName', 'address', 'phone', 'email', 'currency', 'exchangeRate',
  'vatRate', 'vatEnabled', 'receiptHeader', 'receiptFooter', 'storeLogo',
]

function friendlySyncError(err) {
  const code = err?.code || ''
  const msg = err?.message || String(err)
  if (code === 'permission-denied' || msg.includes('permission')) {
    return 'Cloud sync blocked: publish Firestore rules in Firebase Console (Build → Firestore → Rules → Publish).'
  }
  if (code === 'unavailable' || msg.includes('offline')) {
    return 'Cloud sync offline. Check internet connection and try again.'
  }
  return `Cloud sync error: ${msg}`
}

function settingsForCloud(settings) {
  const out = {}
  for (const field of SETTINGS_CLOUD_FIELDS) {
    if (settings[field] === undefined) continue
    if (field === 'storeLogo' && String(settings.storeLogo).startsWith('data:')) continue
    out[field] = settings[field]
  }
  return out
}

function mergeSettings(local, remote) {
  const remoteLogo = remote?.storeLogo
  const useRemoteLogo = remoteLogo && !String(remoteLogo).startsWith('data:')
  const logo = useRemoteLogo ? remoteLogo : (local?.storeLogo || '/Jeibe_Logo.jpg')
  return { ...local, ...remote, storeLogo: logo }
}

function packPayload(store) {
  return {
    products: store.products ?? [],
    sales: store.sales ?? [],
    customers: store.customers ?? [],
    expenses: store.expenses ?? [],
    employees: store.employees ?? [],
    settings: settingsForCloud(store.settings ?? {}),
    updatedAt: serverTimestamp(),
  }
}

export function unpackPayload(data) {
  if (!data) return null
  const local = getStore()
  return {
    products: Array.isArray(data.products) ? data.products : local.products,
    sales: Array.isArray(data.sales) ? data.sales : local.sales,
    customers: Array.isArray(data.customers) ? data.customers : local.customers,
    expenses: Array.isArray(data.expenses) ? data.expenses : local.expenses,
    employees: Array.isArray(data.employees) ? data.employees : local.employees,
    settings: mergeSettings(local.settings, data.settings ?? {}),
  }
}

export function persistLocal(store) {
  for (const key of SYNC_KEYS) saveStore(key, store[key])
  saveStore('settings', store.settings)
}

function storeSignature(store) {
  const linked = (store.sales || []).filter(s => s.customerId).length
  return JSON.stringify({
    employees: store.employees,
    settings: store.settings,
    salesN: (store.sales || []).length,
    salesLinked: linked,
    customersN: (store.customers || []).length,
  })
}

let applyingRemote = false
let pushTimer = null
let pendingPush = null
let lastAppliedSig = ''
let onSyncErrorHandler = null
let onSyncOkHandler = null

export function cancelPendingCloudPush() {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = null
  pendingPush = null
}

export function isApplyingCloudRemote() {
  return applyingRemote
}

function applyRemoteStore(store, onRemoteUpdate) {
  const sig = storeSignature(store)
  if (sig === lastAppliedSig) return false
  applyingRemote = true
  cancelPendingCloudPush()
  persistLocal(store)
  onRemoteUpdate(store)
  lastAppliedSig = sig
  applyingRemote = false
  onSyncOkHandler?.()
  return true
}

/** Fetch latest store document from Firestore. */
export async function pullCloudStore() {
  const db = getFirestore(app)
  const ref = doc(db, ...STORE_REF)
  try {
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      return { store: null, missing: true, error: null }
    }
    return { store: unpackPayload(snap.data()), missing: false, error: null }
  } catch (err) {
    const error = friendlySyncError(err)
    onSyncErrorHandler?.(error)
    return { store: null, missing: false, error }
  }
}

export function startCloudSync({ onRemoteUpdate, onSyncError, onSyncOk }) {
  onSyncErrorHandler = onSyncError ?? null
  onSyncOkHandler = onSyncOk ?? null
  const db = getFirestore(app)
  const ref = doc(db, ...STORE_REF)

  async function bootstrap() {
    try {
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const store = unpackPayload(snap.data())
        if (store) applyRemoteStore(store, onRemoteUpdate)
      } else {
        const local = getStore()
        await setDoc(ref, packPayload(local))
        lastAppliedSig = storeSignature(local)
        onSyncOkHandler?.()
      }
    } catch (err) {
      onSyncError?.(friendlySyncError(err))
    }
  }

  bootstrap()

  const unsub = onSnapshot(
    ref,
    snap => {
      if (!snap.exists()) return
      if (snap.metadata.hasPendingWrites) return
      const store = unpackPayload(snap.data())
      if (!store) return
      applyRemoteStore(store, onRemoteUpdate)
    },
    err => onSyncError?.(friendlySyncError(err))
  )

  return () => {
    unsub()
    cancelPendingCloudPush()
    onSyncErrorHandler = null
    onSyncOkHandler = null
  }
}

function flushPush() {
  pushTimer = null
  if (!pendingPush || applyingRemote) return
  const db = getFirestore(app)
  const ref = doc(db, ...STORE_REF)
  const payload = pendingPush
  pendingPush = null
  setDoc(ref, payload, { merge: true })
    .then(() => {
      lastAppliedSig = storeSignature(getStore())
      onSyncOkHandler?.()
    })
    .catch(err => onSyncErrorHandler?.(friendlySyncError(err)))
}

export function hasPendingCloudPush() {
  return !!pendingPush
}

/**
 * Write any queued local change to the cloud immediately and wait for it.
 * Call this before pulling so an in-flight edit isn't overwritten by stale
 * remote data (e.g. navigating right after linking a sale to a customer).
 */
export async function flushPendingCloudPush() {
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null }
  if (!pendingPush || applyingRemote) return
  const db = getFirestore(app)
  const ref = doc(db, ...STORE_REF)
  const payload = pendingPush
  pendingPush = null
  try {
    await setDoc(ref, payload, { merge: true })
    lastAppliedSig = storeSignature(getStore())
    onSyncOkHandler?.()
  } catch (err) {
    onSyncErrorHandler?.(friendlySyncError(err))
  }
}

export function scheduleCloudPush(partialStore) {
  if (applyingRemote) return
  const local = getStore()
  const next = { ...local, ...partialStore }
  pendingPush = packPayload(next)
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(flushPush, 400)
}

export function pushCloudBatch(updates) {
  if (applyingRemote) return
  const local = getStore()
  const merged = { ...local, ...updates }
  if (updates.settings) {
    merged.settings = { ...local.settings, ...updates.settings }
  }
  pendingPush = packPayload(merged)
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(flushPush, 400)
}
