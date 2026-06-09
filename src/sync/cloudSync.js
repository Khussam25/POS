import { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { app } from '../firebase'
import { getStore, saveStore, normalizeSettings } from '../store'

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

function productRevision(p) {
  return p?.updatedAt ? (Date.parse(p.updatedAt) || 0) : 0
}

/** Combine two product records — keeps the newest edit and non-empty buying prices. */
function mergeProduct(local, remote) {
  if (!remote) return local
  if (!local) return remote

  const lr = productRevision(local)
  const rr = productRevision(remote)
  if (lr > rr) return local
  if (rr > lr) return remote

  return {
    ...remote,
    ...local,
    buyingPriceUSD: (local.buyingPriceUSD || remote.buyingPriceUSD) ?? 0,
    buyingPriceTZS: (local.buyingPriceTZS || remote.buyingPriceTZS) ?? 0,
    sellingPriceTZS: local.sellingPriceTZS || remote.sellingPriceTZS,
    qty: local.qty ?? remote.qty ?? 0,
    name: local.name || remote.name,
    lowStockThreshold: local.lowStockThreshold ?? remote.lowStockThreshold ?? 10,
    updatedAt: local.updatedAt || remote.updatedAt,
  }
}

function mergeProducts(local = [], remote = []) {
  const byId = new Map()
  for (const p of remote) byId.set(p.id, p)
  for (const p of local) {
    const existing = byId.get(p.id)
    byId.set(p.id, existing ? mergeProduct(p, existing) : p)
  }
  return Array.from(byId.values())
}

function mergeRecordsById(local = [], remote = [], mergeFn) {
  const byId = new Map()
  for (const r of remote) byId.set(r.id, r)
  for (const l of local) {
    const existing = byId.get(l.id)
    byId.set(l.id, existing ? mergeFn(l, existing) : l)
  }
  return Array.from(byId.values())
}

function mergeSettings(local, remote) {
  const remoteLogo = remote?.storeLogo
  const useRemoteLogo = remoteLogo && !String(remoteLogo).startsWith('data:')
  const logo = useRemoteLogo ? remoteLogo : (local?.storeLogo || '/Jeibe_Logo.jpg')
  return normalizeSettings({ ...local, ...remote, storeLogo: logo })
}

function productsFingerprint(products) {
  let fp = 0
  for (const p of products || []) {
    fp += (Number(p.qty) || 0) + (Number(p.buyingPriceTZS) || 0)
  }
  return { n: (products || []).length, fp }
}

function mergeEmployees(local = [], remote = []) {
  const byEmail = new Map()
  for (const e of remote) {
    const key = (e.email || '').toLowerCase()
    if (key) byEmail.set(key, e)
  }
  for (const e of local) {
    const key = (e.email || '').toLowerCase()
    if (key && !byEmail.has(key)) byEmail.set(key, e)
  }
  return Array.from(byEmail.values())
}

/**
 * Merge cloud data into local — products are merged per item so inventory edits
 * are not wiped when sales or other data sync from another session.
 */
export function mergeRemoteStore(local, remote) {
  if (!remote) return local
  return {
    products: mergeProducts(local.products ?? [], remote.products ?? []),
    sales: mergeRecordsById(local.sales ?? [], remote.sales ?? [], (a, b) => {
      const ap = a.payments?.length ?? 0
      const bp = b.payments?.length ?? 0
      if (ap !== bp) return ap > bp ? a : b
      return (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')) >= 0 ? b : a
    }),
    customers: mergeRecordsById(local.customers ?? [], remote.customers ?? [], (a, b) => (
      (b.updatedAt && a.updatedAt && b.updatedAt > a.updatedAt) ? b : a
    )),
    expenses: mergeRecordsById(local.expenses ?? [], remote.expenses ?? [], (_, b) => b),
    employees: mergeEmployees(local.employees ?? [], remote.employees ?? []),
    settings: mergeSettings(local.settings, remote.settings ?? {}),
  }
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

function settingsFingerprint(settings) {
  const s = normalizeSettings(settings)
  const { storeLogo, ...rest } = s
  return {
    ...rest,
    storeLogo: storeLogo && String(storeLogo).startsWith('data:') ? '[embedded]' : (storeLogo || ''),
  }
}

function storeSignature(store) {
  const linked = (store.sales || []).filter(s => s.customerId).length
  const pf = productsFingerprint(store.products)
  return JSON.stringify({
    settings: settingsFingerprint(store.settings),
    salesN: (store.sales || []).length,
    salesLinked: linked,
    customersN: (store.customers || []).length,
    employeesN: (store.employees || []).length,
    productsN: pf.n,
    productsFp: pf.fp,
  })
}

let applyingRemote = false
let pushInFlight = false
let pendingPartial = null
let pendingAfterRemote = null
let lastAppliedSig = ''
let lastRemoteStore = null
let onSyncErrorHandler = null
let onSyncOkHandler = null
let onRemoteUpdateHandler = null

function applyPartial(store, partial) {
  if (!partial) return store
  const merged = { ...store, ...partial }
  if (partial.settings) {
    merged.settings = { ...store.settings, ...partial.settings }
  }
  return merged
}

/** Merge unsaved local edits with the latest cloud snapshot so pushes never wipe another user's sales. */
async function prepareMergedStore(partialUpdates = {}) {
  const local = getStore()
  let withUpdates = applyPartial(local, partialUpdates)

  let remote = lastRemoteStore
  if (!remote) {
    const { store } = await pullCloudStore()
    if (store) {
      remote = store
      lastRemoteStore = store
    }
  }
  if (remote) withUpdates = mergeRemoteStore(withUpdates, remote)
  return withUpdates
}

function notifyLocalStore(store) {
  persistLocal(store)
  lastRemoteStore = store
  lastAppliedSig = storeSignature(store)
  onRemoteUpdateHandler?.(store)
}

export function cancelPendingCloudPush() {
  pendingPartial = null
}

export function isApplyingCloudRemote() {
  return applyingRemote
}

function applyRemoteStore(remoteStore, onRemoteUpdate) {
  let local = getStore()
  if (pendingPartial) {
    local = applyPartial(local, pendingPartial)
  }
  const store = mergeRemoteStore(local, remoteStore)
  const sig = storeSignature(store)
  if (sig === lastAppliedSig) return false
  applyingRemote = true
  persistLocal(store)
  lastRemoteStore = store
  onRemoteUpdate(store)
  lastAppliedSig = sig
  applyingRemote = false
  onSyncOkHandler?.()
  if (pendingAfterRemote) {
    const deferred = pendingAfterRemote
    pendingAfterRemote = null
    pushCloudBatch(deferred)
  }
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
  onRemoteUpdateHandler = onRemoteUpdate ?? null
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
        lastRemoteStore = local
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
    onRemoteUpdateHandler = null
    lastRemoteStore = null
  }
}

async function flushPush() {
  if (!pendingPartial || applyingRemote || pushInFlight) return
  const partial = pendingPartial
  pendingPartial = null
  pushInFlight = true
  const db = getFirestore(app)
  const ref = doc(db, ...STORE_REF)
  try {
    const merged = await prepareMergedStore(partial)
    notifyLocalStore(merged)
    await setDoc(ref, packPayload(merged), { merge: true })
    onSyncOkHandler?.()
  } catch (err) {
    pendingPartial = { ...partial, ...(pendingPartial || {}) }
    onSyncErrorHandler?.(friendlySyncError(err))
  } finally {
    pushInFlight = false
    if (pendingPartial) flushPush()
  }
}

export function hasPendingCloudPush() {
  return !!pendingPartial || pushInFlight
}

/**
 * Write any queued local change to the cloud immediately and wait for it.
 * Call this before pulling so an in-flight edit isn't overwritten by stale
 * remote data (e.g. navigating right after linking a sale to a customer).
 */
export async function flushPendingCloudPush() {
  if (!pendingPartial || applyingRemote) return
  const partial = pendingPartial
  pendingPartial = null
  const db = getFirestore(app)
  const ref = doc(db, ...STORE_REF)
  try {
    const merged = await prepareMergedStore(partial)
    notifyLocalStore(merged)
    await setDoc(ref, packPayload(merged), { merge: true })
    onSyncOkHandler?.()
  } catch (err) {
    pendingPartial = { ...partial, ...(pendingPartial || {}) }
    onSyncErrorHandler?.(friendlySyncError(err))
  }
}

/** Push local changes to the cloud immediately (no debounce). */
export function pushStoreNow(updates) {
  if (applyingRemote) {
    pendingAfterRemote = { ...(pendingAfterRemote || {}), ...updates }
    if (updates.settings) {
      pendingAfterRemote.settings = {
        ...(pendingAfterRemote.settings || getStore().settings),
        ...updates.settings,
      }
    }
    return
  }
  pendingPartial = { ...(pendingPartial || {}), ...updates }
  if (updates.settings) {
    pendingPartial.settings = {
      ...(pendingPartial.settings || getStore().settings),
      ...updates.settings,
    }
  }
  flushPush()
}

export function scheduleCloudPush(partialStore) {
  pushStoreNow(partialStore)
}

/** @deprecated use pushStoreNow */
export function pushProductsNow(products) {
  pushStoreNow({ products })
}

export function pushCloudBatch(updates) {
  pushStoreNow(updates)
}
