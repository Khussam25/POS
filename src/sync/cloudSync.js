import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs, writeBatch, deleteField,
} from 'firebase/firestore'
import { app } from '../firebase'
import { getStore, saveStore, normalizeSettings } from '../store'
import { visibleSales } from '../utils/salesOps'

const STORE_REF = ['stores', 'main']
/** Sales live in a subcollection (one doc per sale) so the store never hits
 *  Firestore's 1 MB per-document ceiling as the sale history grows. */
const SALES_COL = ['stores', 'main', 'sales']
/** Max writes per Firestore batch is 500; stay under it. */
const BATCH_LIMIT = 450
const SYNC_KEYS = ['products', 'sales', 'customers', 'expenses', 'employees', 'deletedSaleIds']
/** Ignore cloud pulls briefly after a local save. */
const LOCAL_GRACE_MS = 8000
/** Firestore document limit is 1 MiB — warn before write fails. */
const FIRESTORE_SOFT_LIMIT = 950_000

const SETTINGS_CLOUD_FIELDS = [
  'storeName', 'address', 'phone', 'email', 'currency', 'exchangeRate',
  'vatRate', 'vatEnabled', 'receiptHeader', 'receiptFooter', 'storeLogo',
]

function friendlySyncError(err) {
  const code = err?.code || ''
  const msg = err?.message || String(err)
  if (code === 'permission-denied' || msg.includes('permission')) {
    return 'Cloud sync blocked: in Firebase Console open Firestore → Rules, paste firestore.rules from the project, and click Publish.'
  }
  if (code === 'unavailable' || msg.includes('offline')) {
    return 'Cloud sync offline. Check internet connection and try again.'
  }
  if (code === 'invalid-argument' || msg.includes('maximum allowed size') || msg.includes('too large')) {
    return 'Cloud sync failed: store data is too large for Firebase (1 MB limit). Contact support — sales still saved on this device.'
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

function mergeTombstones(local = [], remote = []) {
  return [...new Set([...(local || []), ...(remote || [])])]
}

function mergeSales(local = [], remote = [], tombstones = []) {
  const deleted = new Set(tombstones || [])
  const byId = new Map()
  for (const r of remote) {
    if (!deleted.has(r.id)) byId.set(r.id, r)
  }
  for (const l of local) {
    if (deleted.has(l.id)) {
      byId.delete(l.id)
      continue
    }
    const existing = byId.get(l.id)
    if (existing) {
      const ap = l.payments?.length ?? 0
      const bp = existing.payments?.length ?? 0
      if (ap !== bp) byId.set(l.id, ap > bp ? l : existing)
      else {
        const keepLocal = (l.date + (l.time || '')).localeCompare(existing.date + (existing.time || '')) >= 0
        byId.set(l.id, keepLocal ? l : existing)
      }
    } else {
      byId.set(l.id, l)
    }
  }
  return Array.from(byId.values())
}

function mergeSettings(local, remote) {
  const remoteLogo = remote?.storeLogo
  const useRemoteLogo = remoteLogo && !String(remoteLogo).startsWith('data:')
  const logo = useRemoteLogo ? remoteLogo : (local?.storeLogo || '/Jeibe_Logo.jpg')
  return normalizeSettings({ ...local, ...remote, storeLogo: logo })
}

/** djb2 string hash → 32-bit int, for cheap content fingerprints. */
function hashStr(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return h
}

/** Order-independent fingerprint of a record list over selected fields. */
function listFingerprint(list, fields) {
  let h = 0
  for (const item of list || []) {
    let s = ''
    for (const f of fields) s += '|' + String(item?.[f] ?? '')
    h = (h + hashStr(s)) | 0
  }
  return h
}

/** Sales fingerprint including the fields that change on edits and repayments. */
function salesFingerprint(sales) {
  let h = 0
  for (const s of sales || []) {
    const paid = s?.amountPaid == null ? '' : s.amountPaid
    const payN = Array.isArray(s?.payments) ? s.payments.length : 0
    const itemsN = Array.isArray(s?.items) ? s.items.length : 0
    const str = `${s?.id}|${s?.total}|${paid}|${payN}|${itemsN}|${s?.customerId ?? ''}|${s?.customer ?? ''}|${s?.date}|${s?.time ?? ''}|${s?.paymentMethod ?? ''}|${s?.discountAmount ?? ''}`
    h = (h + hashStr(str)) | 0
  }
  return h
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

export function mergeRemoteStore(local, remote) {
  if (!remote) return local
  const deletedSaleIds = mergeTombstones(local.deletedSaleIds, remote.deletedSaleIds)
  return {
    products: mergeProducts(local.products ?? [], remote.products ?? []),
    sales: mergeSales(local.sales ?? [], remote.sales ?? [], deletedSaleIds),
    deletedSaleIds,
    customers: mergeRecordsById(local.customers ?? [], remote.customers ?? [], (a, b) => (
      (b.updatedAt && a.updatedAt && b.updatedAt > a.updatedAt) ? b : a
    )),
    expenses: mergeRecordsById(local.expenses ?? [], remote.expenses ?? [], (_, b) => b),
    employees: mergeEmployees(local.employees ?? [], remote.employees ?? []),
    settings: mergeSettings(local.settings, remote.settings ?? {}),
  }
}

/** Lightweight summary of the sales set, stored on the main doc so a poll can
 *  tell whether the (potentially large) sales subcollection needs re-reading. */
function salesArrayFp(sales) {
  const visible = sales || []
  return { count: visible.length, fp: salesFingerprint(visible) }
}

/** Per-sale content hash — used to push only the sales that actually changed. */
function saleSig(s) {
  const paid = s?.amountPaid == null ? '' : s.amountPaid
  const payN = Array.isArray(s?.payments) ? s.payments.length : 0
  const itemsN = Array.isArray(s?.items) ? s.items.length : 0
  return hashStr(`${s?.total}|${paid}|${payN}|${itemsN}|${s?.customerId ?? ''}|${s?.customer ?? ''}|${s?.date}|${s?.time ?? ''}|${s?.paymentMethod ?? ''}|${s?.discountAmount ?? ''}|${JSON.stringify(s?.items ?? [])}`)
}

/** The main store document — everything except the sales history. */
function packMainPayload(store) {
  const deletedSaleIds = store.deletedSaleIds ?? []
  return {
    products: store.products ?? [],
    deletedSaleIds,
    customers: store.customers ?? [],
    expenses: store.expenses ?? [],
    employees: store.employees ?? [],
    settings: settingsForCloud(store.settings ?? {}),
    salesMeta: salesArrayFp(visibleSales(store.sales, deletedSaleIds)),
    updatedAt: serverTimestamp(),
  }
}

/** Apply a list of {set} / {del} sale ops to the subcollection, batched. */
async function commitSaleOps(db, ops) {
  let batch = writeBatch(db)
  let n = 0
  for (const op of ops) {
    if (op.set) batch.set(doc(db, ...SALES_COL, op.set.id), op.set)
    else if (op.del) batch.delete(doc(db, ...SALES_COL, op.del))
    if (++n >= BATCH_LIMIT) {
      await batch.commit()
      batch = writeBatch(db)
      n = 0
    }
  }
  if (n > 0) await batch.commit()
}

/** Map of sale id → content sig for what we believe is in the cloud
 *  subcollection. Decoupled from lastRemoteStore so a push never assumes a
 *  local-only sale (e.g. one queued during migration) is already uploaded. */
let cloudSaleSigs = null

function sigsOf(sales) {
  const m = new Map()
  for (const s of sales || []) if (s?.id) m.set(s.id, saleSig(s))
  return m
}

/** Upsert every sale into the subcollection (idempotent; used for migration). */
async function writeAllSales(db, sales) {
  await commitSaleOps(db, (sales || []).filter(s => s?.id).map(s => ({ set: s })))
  cloudSaleSigs = sigsOf(sales)
}

/** Push only the sales that changed vs what the cloud holds, plus deletions. */
async function pushSalesDiff(db, store) {
  const visible = visibleSales(store.sales, store.deletedSaleIds)
  const known = cloudSaleSigs || new Map()
  const ops = []
  const nextSigs = new Map()
  for (const s of visible) {
    if (!s?.id) continue
    const sig = saleSig(s)
    nextSigs.set(s.id, sig)
    if (known.get(s.id) !== sig) ops.push({ set: s })
  }
  for (const id of new Set(store.deletedSaleIds || [])) {
    if (known.has(id)) ops.push({ del: id })
  }
  if (ops.length) await commitSaleOps(db, ops)
  cloudSaleSigs = nextSigs // cloud subcollection now holds exactly the visible set
}

/** One-time migration: lift sales out of the oversized main doc field into the
 *  subcollection, then drop the embedded field so the main doc shrinks. */
async function migrateLegacySalesIfNeeded(db, ref, data) {
  if (!Array.isArray(data.sales) || data.sales.length === 0) return
  await writeAllSales(db, data.sales)
  await setDoc(ref, { sales: deleteField(), salesMeta: salesArrayFp(data.sales) }, { merge: true })
}

/** Read the sales subcollection only when the main doc shows it changed. */
async function pullSales(db, mainData) {
  const local = getStore()
  const tombstones = mergeTombstones(local.deletedSaleIds, mainData.deletedSaleIds)
  const localVisible = visibleSales(local.sales, tombstones)
  const localFp = `${localVisible.length}:${salesFingerprint(localVisible)}`
  const meta = mainData.salesMeta
  if (meta && `${meta.count}:${meta.fp}` === localFp) {
    // Remote sales identical to local — skip the read. Cloud holds these ids.
    cloudSaleSigs = sigsOf(localVisible)
    return localVisible
  }
  const snap = await getDocs(collection(db, ...SALES_COL))
  if (!snap.empty) {
    const arr = snap.docs.map(d => d.data())
    cloudSaleSigs = sigsOf(arr)
    return arr
  }
  // Legacy doc not migrated yet: fall back to the embedded array.
  if (Array.isArray(mainData.sales)) {
    cloudSaleSigs = sigsOf(mainData.sales)
    return mainData.sales
  }
  cloudSaleSigs = new Map()
  return []
}

function estimatePayloadBytes(payload) {
  try {
    return new Blob([JSON.stringify(payload)]).size
  } catch {
    return JSON.stringify(payload).length
  }
}

export function unpackPayload(data) {
  if (!data) return null
  const local = getStore()
  return {
    products: Array.isArray(data.products) ? data.products : local.products,
    sales: Array.isArray(data.sales) ? data.sales : local.sales,
    deletedSaleIds: Array.isArray(data.deletedSaleIds) ? data.deletedSaleIds : (local.deletedSaleIds ?? []),
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
  return JSON.stringify({
    settings: settingsFingerprint(store.settings),
    salesN: (store.sales || []).length,
    salesFp: salesFingerprint(store.sales),
    deletedSalesN: (store.deletedSaleIds || []).length,
    customersN: (store.customers || []).length,
    customersFp: listFingerprint(store.customers, ['id', 'name', 'phone', 'note', 'code', 'updatedAt']),
    expensesN: (store.expenses || []).length,
    expensesFp: listFingerprint(store.expenses, ['id', 'amount', 'category', 'date', 'note', 'updatedAt']),
    employeesN: (store.employees || []).length,
    employeesFp: listFingerprint(store.employees, ['id', 'email', 'role', 'status', 'name', 'phone']),
    productsN: (store.products || []).length,
    productsFp: listFingerprint(store.products, ['id', 'qty', 'sellingPriceTZS', 'buyingPriceTZS', 'name', 'lowStockThreshold', 'updatedAt']),
  })
}

let applyingRemote = false
let pushInFlight = false
let pendingPartial = null
let pendingAfterRemote = null
let pushTimer = null
let pushFailures = 0
const MAX_PUSH_RETRIES = 6
let lastAppliedSig = ''
let lastRemoteStore = null
let lastLocalMutationAt = 0
let onSyncErrorHandler = null
let onSyncOkHandler = null

export function markLocalMutation() {
  lastLocalMutationAt = Date.now()
}

export function shouldSkipRemoteApply() {
  if (pushInFlight || pendingPartial) return true
  return Date.now() - lastLocalMutationAt < LOCAL_GRACE_MS
}

function applyPartial(store, partial) {
  if (!partial) return store
  const merged = { ...store, ...partial }
  if (partial.settings) merged.settings = { ...store.settings, ...partial.settings }
  return merged
}

function cleanStore(store) {
  return {
    ...store,
    sales: visibleSales(store.sales, store.deletedSaleIds),
  }
}

async function buildCloudStore(partialUpdates = {}) {
  let store = cleanStore(applyPartial(getStore(), partialUpdates))
  let remote = lastRemoteStore
  if (!remote) {
    const { store: pulled } = await pullCloudStore()
    if (pulled) {
      remote = pulled
      lastRemoteStore = pulled
    }
  }
  if (remote) store = cleanStore(mergeRemoteStore(store, remote))
  return store
}

export function cancelPendingCloudPush() {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = null
  pendingPartial = null
}

export function isApplyingCloudRemote() {
  return applyingRemote
}

function applyRemoteStore(remoteStore, onRemoteUpdate) {
  if (shouldSkipRemoteApply()) return false

  const store = cleanStore(mergeRemoteStore(getStore(), remoteStore))
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

export async function pullCloudStore() {
  const db = getFirestore(app)
  const ref = doc(db, ...STORE_REF)
  try {
    const snap = await getDoc(ref)
    if (!snap.exists()) return { store: null, missing: true, error: null }
    const data = snap.data()
    const sales = await pullSales(db, data)
    return { store: unpackPayload({ ...data, sales }), missing: false, error: null }
  } catch (err) {
    const error = friendlySyncError(err)
    onSyncErrorHandler?.(error)
    return { store: null, missing: false, error }
  }
}

/**
 * Cloud sync: pull once on login, push after local edits.
 * No live listener — it was overwriting POS sales and deletes mid-save.
 */
export function startCloudSync({ onRemoteUpdate, onSyncError, onSyncOk }) {
  onSyncErrorHandler = onSyncError ?? null
  onSyncOkHandler = onSyncOk ?? null
  const db = getFirestore(app)
  const ref = doc(db, ...STORE_REF)

  async function bootstrap() {
    try {
      const snap = await getDoc(ref)
      if (snap.exists()) {
        // Move any legacy embedded sales into the subcollection first, then pull.
        await migrateLegacySalesIfNeeded(db, ref, snap.data())
        const { store } = await pullCloudStore()
        if (store) applyRemoteStore(store, onRemoteUpdate)
        reconcileLocalAheadSales()
      } else {
        const local = cleanStore(getStore())
        const payload = packMainPayload(local)
        const bytes = estimatePayloadBytes(payload)
        if (bytes > FIRESTORE_SOFT_LIMIT) {
          onSyncError?.('Cloud sync: initial upload too large for Firebase (1 MB). Data is saved on this device.')
          return
        }
        await setDoc(ref, payload)
        await writeAllSales(db, visibleSales(local.sales, local.deletedSaleIds))
        lastRemoteStore = local
        lastAppliedSig = storeSignature(local)
        onSyncOkHandler?.()
      }
    } catch (err) {
      onSyncError?.(friendlySyncError(err))
    }
  }

  bootstrap()

  return () => {
    cancelPendingCloudPush()
    onSyncErrorHandler = null
    onSyncOkHandler = null
    lastRemoteStore = null
    cloudSaleSigs = null
  }
}

/** After login, push any sale that exists locally but isn't yet in the cloud
 *  subcollection (e.g. sales made while the store was over the 1 MB limit). */
function reconcileLocalAheadSales() {
  const local = cleanStore(getStore())
  const known = cloudSaleSigs || new Map()
  const visible = visibleSales(local.sales, local.deletedSaleIds)
  const ahead = visible.some(s => s?.id && known.get(s.id) !== saleSig(s))
  const pendingDeletes = (local.deletedSaleIds || []).some(id => known.has(id))
  if (ahead || pendingDeletes) pushStoreNow({ sales: local.sales })
}

async function flushPush() {
  if (!pendingPartial || pushInFlight) return
  const partial = pendingPartial
  pendingPartial = null
  pushInFlight = true
  const db = getFirestore(app)
  const ref = doc(db, ...STORE_REF)
  try {
    const merged = await buildCloudStore(partial)
    // Push the sales subcollection first so a failure there can't leave the
    // main doc's salesMeta claiming sales that never got written.
    await pushSalesDiff(db, merged)
    const payload = packMainPayload(merged)
    const bytes = estimatePayloadBytes(payload)
    if (bytes > FIRESTORE_SOFT_LIMIT) {
      throw new Error('Document too large for Firestore (1 MB limit)')
    }
    await setDoc(ref, payload, { merge: true })
    lastRemoteStore = merged
    lastAppliedSig = storeSignature(merged)
    pushFailures = 0
    onSyncOkHandler?.()
  } catch (err) {
    pushFailures++
    pendingPartial = { ...partial, ...(pendingPartial || {}) }
    onSyncErrorHandler?.(friendlySyncError(err))
  } finally {
    pushInFlight = false
    // Retry queued edits, but back off on repeated failures and stop after a
    // cap so a denied / offline backend can't spin a 4-per-second error loop.
    // Whatever stays queued flushes on the next edit or refresh.
    if (pendingPartial) {
      if (pushFailures === 0) scheduleFlush()
      else if (pushFailures <= MAX_PUSH_RETRIES) {
        scheduleFlush(Math.min(1000 * 2 ** (pushFailures - 1), 30000))
      }
    }
  }
}

function scheduleFlush(delay = 250) {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    flushPush()
  }, delay)
}

export function hasPendingCloudPush() {
  return !!pendingPartial || pushInFlight
}

export async function flushPendingCloudPush() {
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  if (!pendingPartial || pushInFlight) return
  await flushPush()
}

export function pushStoreNow(updates) {
  markLocalMutation()
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
  scheduleFlush()
}

export function scheduleCloudPush(partialStore) {
  pushStoreNow(partialStore)
}

export function pushProductsNow(products) {
  pushStoreNow({ products })
}

export function pushCloudBatch(updates) {
  pushStoreNow(updates)
}
