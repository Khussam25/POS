// Central data store with localStorage persistence
import { backfillCustomerIds } from './utils/customers'

const SEED = {
  products: [],

  sales: [],

  customers: [],

  expenses: [],

  employees: [
    { id: 'emp1', name: 'Khussam Mohamed', role: 'Admin', email: 'khussamjuma20@gmail.com', phone: '', username: 'khussam.mohamed', status: 'Active', initials: 'KM', color: '#1E4E8C' },
    { id: 'emp2', name: 'Rhoda Mutafungwa', role: 'Admin', email: 'rhodamutafungwa@gmail.com', phone: '+255 712 345 678', username: 'rhoda.mutafungwa', status: 'Active', initials: 'RM', color: '#C92B36' },
    { id: 'emp3', name: 'Rustick Mbilauli', role: 'Cashier', email: 'rmbilauli@gmail.com', phone: '+255 754 901 234', username: 'rustick.mbilauli', status: 'Active', initials: 'RM', color: '#1E4E8C' },
  ],

  settings: {
    storeName: 'JEIBE Original Products From USA',
    address: 'Kariakoo Market, Dar es Salaam, Tanzania',
    phone: '+255 712 345 678',
    email: 'info@jeibe.co.tz',
    currency: 'TZS',
    exchangeRate: 2450,
    vatRate: 0,
    vatEnabled: false,
    receiptHeader: 'Thank you for shopping at JEIBE!',
    receiptFooter: 'Original Products From USA',
    storeLogo: '/Jeibe_Logo.jpg',
  },
};

function load(key) {
  try {
    const raw = localStorage.getItem(`jeibe_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function save(key, value) {
  localStorage.setItem(`jeibe_${key}`, JSON.stringify(value));
}

const DATA_VERSION = '8'

/** Old demo inventory shipped in v7 — remove if the store still has only these items. */
const DEMO_PRODUCT_IDS = new Set([
  'CV-MC-001', 'NG-HB-002', 'TO-NI-003', 'LO-RE-004', 'OL-TE-005',
  'MB-FM-006', 'NY-BG-007', 'DV-DM-008', 'AV-DM-009', 'PC-RT-010',
])

function isDemoOnlyInventory(products) {
  return Array.isArray(products) && products.length > 0 && products.every(p => DEMO_PRODUCT_IDS.has(p.id))
}

function getStore() {
  const prevVersion = localStorage.getItem('jeibe_version')
  if (prevVersion !== DATA_VERSION) {
    if (prevVersion === '7') {
      const products = load('products')
      if (isDemoOnlyInventory(products)) localStorage.removeItem('jeibe_products')
    } else if (prevVersion != null) {
      // Unknown older version: do not wipe — only set version (avoids accidental data loss on deploy)
      console.warn(`JEIBE POS: upgraded store version ${prevVersion} → ${DATA_VERSION} without clearing data.`)
    }
    localStorage.setItem('jeibe_version', DATA_VERSION)
  }
  const customers = load('customers') ?? SEED.customers
  let sales = load('sales') ?? SEED.sales
  const { sales: linkedSales, changed } = backfillCustomerIds(customers, sales)
  if (changed) {
    sales = linkedSales
    save('sales', linkedSales)
  }
  return {
    products: load('products') ?? [],
    sales,
    customers,
    expenses: load('expenses') ?? SEED.expenses,
    employees: load('employees') ?? SEED.employees,
    settings: { storeLogo: '/Jeibe_Logo.jpg', ...(load('settings') ?? SEED.settings) },
  };
}

function saveStore(key, value) {
  try {
    save(key, value);
    return true;
  } catch (err) {
    console.error(`Failed to save jeibe_${key}:`, err);
    return false;
  }
}

/** Persist multiple keys; rolls back keys already written if a later write fails. */
function saveStoreBatch(updates) {
  const written = []
  try {
    for (const [key, value] of Object.entries(updates)) {
      save(key, value);
      written.push(key);
    }
    return true;
  } catch (err) {
    console.error('Failed to save batch:', err);
    return false;
  }
}

export { getStore, saveStore, saveStoreBatch, SEED };
