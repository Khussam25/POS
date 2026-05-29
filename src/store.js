// Central data store with localStorage persistence

const SEED = {
  products: [
    { id: 'CV-MC-001', name: 'CeraVe Moisturizing Cream', category: 'Moisturizers', buyingPriceUSD: 14.99, sellingPriceTZS: 55000, qty: 45, lowStockThreshold: 10, expiryDate: '2026-08-15', sku: 'CV-MC-001' },
    { id: 'NG-HB-002', name: 'Neutrogena Hydro Boost Serum', category: 'Serums', buyingPriceUSD: 24.99, sellingPriceTZS: 89000, qty: 8, lowStockThreshold: 10, expiryDate: '2026-05-30', sku: 'NG-HB-002' },
    { id: 'TO-NI-003', name: 'The Ordinary Niacinamide 10%', category: 'Serums', buyingPriceUSD: 6.99, sellingPriceTZS: 28000, qty: 0, lowStockThreshold: 5, expiryDate: '2027-01-20', sku: 'TO-NI-003' },
    { id: 'LO-RE-004', name: "L'Oreal Revitalift Eye Cream", category: 'Eye Care', buyingPriceUSD: 18.99, sellingPriceTZS: 72000, qty: 22, lowStockThreshold: 5, expiryDate: '2026-11-10', sku: 'LO-RE-004' },
    { id: 'OL-TE-005', name: 'Olay Total Effects SPF30', category: 'Sunscreen', buyingPriceUSD: 22.49, sellingPriceTZS: 82000, qty: 5, lowStockThreshold: 8, expiryDate: '2026-06-01', sku: 'OL-TE-005' },
    { id: 'MB-FM-006', name: 'Maybelline Fit Me Foundation', category: 'Foundation', buyingPriceUSD: 12.99, sellingPriceTZS: 38000, qty: 30, lowStockThreshold: 5, expiryDate: '2027-03-15', sku: 'MB-FM-006' },
    { id: 'NY-BG-007', name: 'NYX Butter Gloss', category: 'Lip Care', buyingPriceUSD: 8.49, sellingPriceTZS: 28500, qty: 50, lowStockThreshold: 10, expiryDate: '2027-05-20', sku: 'NY-BG-007' },
    { id: 'DV-DM-008', name: 'Dove Deep Moisture Body Wash', category: 'Body Care', buyingPriceUSD: 9.99, sellingPriceTZS: 34000, qty: 40, lowStockThreshold: 10, expiryDate: '2027-08-01', sku: 'DV-DM-008' },
    { id: 'AV-DM-009', name: 'Aveeno Daily Moisturizing Lotion', category: 'Body Care', buyingPriceUSD: 11.99, sellingPriceTZS: 44000, qty: 7, lowStockThreshold: 10, expiryDate: '2026-09-15', sku: 'AV-DM-009' },
    { id: 'PC-RT-010', name: 'Pond\'s Rejuveness Anti-Wrinkle', category: 'Anti-Aging', buyingPriceUSD: 16.49, sellingPriceTZS: 58000, qty: 18, lowStockThreshold: 5, expiryDate: '2026-12-31', sku: 'PC-RT-010' },
  ],

  sales: [],

  expenses: [],

  employees: [
    { id: 'emp1', name: 'Rhoda Mutafungwa', role: 'Admin', email: 'rhodamutafungwa@gmail.com', phone: '+255 712 345 678', username: 'rhoda.mutafungwa', status: 'Active', initials: 'RM', color: '#C92B36' },
    { id: 'emp2', name: 'Rustick Mbilauli', role: 'Cashier', email: 'rustick.mbilauli@jeibe.co.tz', phone: '+255 754 901 234', username: 'rustick.mbilauli', status: 'Active', initials: 'RM', color: '#1E4E8C' },
    { id: 'emp3', name: 'Neema Juma', role: 'Cashier', email: 'neema.juma@jeibe.co.tz', phone: '+255 765 432 100', username: 'neema.juma', status: 'Inactive', initials: 'NJ', color: '#1E4E8C' },
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

const DATA_VERSION = '5'

function getStore() {
  if (localStorage.getItem('jeibe_version') !== DATA_VERSION) {
    ['products', 'sales', 'expenses', 'employees', 'settings'].forEach(k => localStorage.removeItem(`jeibe_${k}`))
    localStorage.setItem('jeibe_version', DATA_VERSION)
  }
  return {
    products: load('products') ?? SEED.products,
    sales: load('sales') ?? SEED.sales,
    expenses: load('expenses') ?? SEED.expenses,
    employees: load('employees') ?? SEED.employees,
    settings: load('settings') ?? SEED.settings,
  };
}

function saveStore(key, value) {
  save(key, value);
}

export { getStore, saveStore, SEED };
