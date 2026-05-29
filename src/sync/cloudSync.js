import { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { app } from '../firebase'
import { getStore, saveStore, saveStoreBatch } from '../store'

const STORE_REF = ['stores', 'main']
const SYNC_KEYS = ['products', 'sales', 'expenses', 'employees']

const SETTINGS_CLOUD_FIELDS = [
  'storeName', 'address', 'phone', 'email', 'currency', 'exchangeRate',
  'vatRate', 'vatEnabled', 'receiptHeader', 'receiptFooter', 'storeLogo',
]

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
    expenses: store.expenses ?? [],
    employees: store.employees ?? [],
    settings: settingsForCloud(store.settings ?? {}),
    updatedAt: serverTimestamp(),
  }
}

function unpackPayload(data) {
  if (!data) return null
  const local = getStore()
  return {
    products: Array.isArray(data.products) ? data.products : local.products,
    sales: Array.isArray(data.sales) ? data.sales : local.sales,
    expenses: Array.isArray(data.expenses) ? data.expenses : local.expenses,
    employees: Array.isArray(data.employees) ? data.employees : local.employees,
    settings: mergeSettings(local.settings, data.settings ?? {}),
  }
}

function persistLocal(store) {
  for (const key of SYNC_KEYS) saveStore(key, store[key])
  saveStore('settings', store.settings)
}

let applyingRemote = false
let pushTimer = null
let pendingPush = null

/**
 * Real-time sync so desktop, phone, and tablet share the same store data.
 * Requires Firestore rules that allow authenticated users to read/write stores/main.
 */
export function startCloudSync({ onRemoteUpdate }) {
  const db = getFirestore(app)
  const ref = doc(db, ...STORE_REF)

  async function bootstrap() {
    try {
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const store = unpackPayload(snap.data())
        if (store) {
          applyingRemote = true
          persistLocal(store)
          onRemoteUpdate(store)
          applyingRemote = false
        }
      } else {
        const local = getStore()
        await setDoc(ref, packPayload(local))
      }
    } catch (err) {
      console.warn('Cloud sync bootstrap failed (offline?):', err)
    }
  }

  bootstrap()

  const unsub = onSnapshot(
    ref,
    snap => {
      if (!snap.exists() || applyingRemote) return
      const store = unpackPayload(snap.data())
      if (!store) return
      applyingRemote = true
      persistLocal(store)
      onRemoteUpdate(store)
      applyingRemote = false
    },
    err => console.warn('Cloud sync listener error:', err)
  )

  return () => {
    unsub()
    if (pushTimer) clearTimeout(pushTimer)
  }
}

function flushPush() {
  pushTimer = null
  if (!pendingPush || applyingRemote) return
  const db = getFirestore(app)
  const ref = doc(db, ...STORE_REF)
  const payload = pendingPush
  pendingPush = null
  setDoc(ref, payload, { merge: true }).catch(err => {
    console.warn('Cloud sync push failed:', err)
  })
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

export function isApplyingCloudRemote() {
  return applyingRemote
}
