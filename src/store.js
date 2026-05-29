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

  sales: [
    { id: 's1', date: '2026-05-28', time: '09:14', customer: 'Amina Hassan', items: [{ productId: 'LO-RE-004', name: "L'Oreal Revitalift Eye Cream", qty: 1, price: 72000 }, { productId: 'NG-HB-002', name: 'Neutrogena Hydro Boost Serum', qty: 1, price: 89000 }], subtotal: 138500, vat: 0, total: 138500, paymentMethod: 'Cash', soldBy: 'Rhoda Mutafungwa' },
    { id: 's2', date: '2026-05-28', time: '10:32', customer: 'Grace Mwangi', items: [{ productId: 'DV-DM-008', name: 'Dove Deep Moisture Body Wash', qty: 1, price: 72000 }], subtotal: 72000, vat: 0, total: 72000, paymentMethod: 'Mobile Money', soldBy: 'Rustick Mbilauli' },
    { id: 's3', date: '2026-05-28', time: '11:05', customer: 'Walk-in Customer', items: [{ productId: 'OL-TE-005', name: 'Olay Total Effects SPF30', qty: 2, price: 82500 }], subtotal: 165000, vat: 0, total: 165000, paymentMethod: 'Card', soldBy: 'Rhoda Mutafungwa' },
    { id: 's4', date: '2026-05-28', time: '13:22', customer: 'Fatuma Ally', items: [{ productId: 'CV-MC-001', name: 'CeraVe Moisturizing Cream', qty: 2, price: 51000 }], subtotal: 102000, vat: 0, total: 102000, paymentMethod: 'Cash', soldBy: 'Rhoda Mutafungwa' },
    { id: 's5', date: '2026-05-28', time: '14:45', customer: 'Walk-in Customer', items: [{ productId: 'NY-BG-007', name: 'NYX Butter Gloss', qty: 1, price: 49000 }], subtotal: 49000, vat: 0, total: 49000, paymentMethod: 'Mobile Money', soldBy: 'Rustick Mbilauli' },
    // Earlier May sales
    { id: 's6', date: '2026-05-01', time: '10:00', customer: 'Halima Said', items: [{ productId: 'MB-FM-006', name: 'Maybelline Fit Me Foundation', qty: 2, price: 38000 }], subtotal: 76000, vat: 0, total: 76000, paymentMethod: 'Cash', soldBy: 'Rustick Mbilauli' },
    { id: 's7', date: '2026-05-03', time: '11:30', customer: 'Joyce Mbeki', items: [{ productId: 'CV-MC-001', name: 'CeraVe Moisturizing Cream', qty: 3, price: 55000 }], subtotal: 165000, vat: 0, total: 165000, paymentMethod: 'Card', soldBy: 'Rhoda Mutafungwa' },
    { id: 's8', date: '2026-05-05', time: '14:00', customer: 'Walk-in Customer', items: [{ productId: 'LO-RE-004', name: "L'Oreal Revitalift Eye Cream", qty: 2, price: 72000 }], subtotal: 144000, vat: 0, total: 144000, paymentMethod: 'Mobile Money', soldBy: 'Rustick Mbilauli' },
    { id: 's9', date: '2026-05-10', time: '09:45', customer: 'Rehema Ali', items: [{ productId: 'AV-DM-009', name: 'Aveeno Daily Moisturizing Lotion', qty: 4, price: 44000 }], subtotal: 176000, vat: 0, total: 176000, paymentMethod: 'Cash', soldBy: 'Rhoda Mutafungwa' },
    { id: 's10', date: '2026-05-15', time: '16:20', customer: 'Doreen Mhina', items: [{ productId: 'PC-RT-010', name: "Pond's Rejuveness", qty: 5, price: 58000 }], subtotal: 290000, vat: 0, total: 290000, paymentMethod: 'Card', soldBy: 'Rhoda Mutafungwa' },
    { id: 's11', date: '2026-05-20', time: '12:15', customer: 'Sara Komba', items: [{ productId: 'NG-HB-002', name: 'Neutrogena Hydro Boost Serum', qty: 3, price: 89000 }], subtotal: 267000, vat: 0, total: 267000, paymentMethod: 'Cash', soldBy: 'Rustick Mbilauli' },
    { id: 's12', date: '2026-05-22', time: '10:00', customer: 'Maria Osei', items: [{ productId: 'DV-DM-008', name: 'Dove Deep Moisture Body Wash', qty: 5, price: 34000 }], subtotal: 170000, vat: 0, total: 170000, paymentMethod: 'Mobile Money', soldBy: 'Rhoda Mutafungwa' },
    { id: 's13', date: '2026-05-25', time: '14:30', customer: 'Walk-in Customer', items: [{ productId: 'NY-BG-007', name: 'NYX Butter Gloss', qty: 8, price: 28500 }], subtotal: 228000, vat: 0, total: 228000, paymentMethod: 'Cash', soldBy: 'Rustick Mbilauli' },
    { id: 's14', date: '2026-05-27', time: '11:00', customer: 'Fatuma Ally', items: [{ productId: 'OL-TE-005', name: 'Olay Total Effects SPF30', qty: 3, price: 82000 }], subtotal: 246000, vat: 0, total: 246000, paymentMethod: 'Card', soldBy: 'Rhoda Mutafungwa' },
    { id: 's15', date: '2026-05-27', time: '15:45', customer: 'Zawadi Kimani', items: [{ productId: 'MB-FM-006', name: 'Maybelline Fit Me Foundation', qty: 3, price: 38000 }], subtotal: 114000, vat: 0, total: 114000, paymentMethod: 'Cash', soldBy: 'Rhoda Mutafungwa' },
    { id: 's16', date: '2026-05-26', time: '09:00', customer: 'Walk-in Customer', items: [{ productId: 'CV-MC-001', name: 'CeraVe Moisturizing Cream', qty: 5, price: 55000 }], subtotal: 275000, vat: 0, total: 275000, paymentMethod: 'Mobile Money', soldBy: 'Rustick Mbilauli' },
    { id: 's17', date: '2026-05-24', time: '13:30', customer: 'Aisha Mbogo', items: [{ productId: 'LO-RE-004', name: "L'Oreal Revitalift Eye Cream", qty: 3, price: 72000 }], subtotal: 216000, vat: 0, total: 216000, paymentMethod: 'Cash', soldBy: 'Rhoda Mutafungwa' },
    { id: 's18', date: '2026-05-23', time: '10:30', customer: 'Joyce Mbeki', items: [{ productId: 'AV-DM-009', name: 'Aveeno Daily Moisturizing Lotion', qty: 3, price: 44000 }], subtotal: 132000, vat: 0, total: 132000, paymentMethod: 'Card', soldBy: 'Rustick Mbilauli' },
    { id: 's19', date: '2026-05-08', time: '14:15', customer: 'Halima Said', items: [{ productId: 'PC-RT-010', name: "Pond's Rejuveness", qty: 4, price: 58000 }], subtotal: 232000, vat: 0, total: 232000, paymentMethod: 'Cash', soldBy: 'Rhoda Mutafungwa' },
    { id: 's20', date: '2026-05-12', time: '11:45', customer: 'Rehema Ali', items: [{ productId: 'NG-HB-002', name: 'Neutrogena Hydro Boost Serum', qty: 2, price: 89000 }], subtotal: 178000, vat: 0, total: 178000, paymentMethod: 'Mobile Money', soldBy: 'Rustick Mbilauli' },
  ],

  expenses: [
    { id: 'e1', date: '2026-05-28', category: 'Electricity', description: 'Monthly electricity bill', amount: 180000, addedBy: 'Rhoda Mutafungwa' },
    { id: 'e2', date: '2026-05-26', category: 'Shipment', description: 'DHL shipment from USA - May batch', amount: 850000, addedBy: 'Rhoda Mutafungwa' },
    { id: 'e3', date: '2026-05-25', category: 'Wages & Salary', description: 'Staff salaries - May', amount: 1200000, addedBy: 'Rhoda Mutafungwa' },
    { id: 'e4', date: '2026-05-20', category: 'Rent', description: 'Monthly shop rent', amount: 450000, addedBy: 'Rhoda Mutafungwa' },
    { id: 'e5', date: '2026-05-15', category: 'Internet', description: 'Airtel internet monthly', amount: 25000, addedBy: 'Rustick Mbilauli' },
    { id: 'e6', date: '2026-05-10', category: 'Deliveries', description: 'Local delivery fees - week 2', amount: 35000, addedBy: 'Rustick Mbilauli' },
    { id: 'e7', date: '2026-05-05', category: 'Packaging', description: 'Bags and boxes restock', amount: 65000, addedBy: 'Rhoda Mutafungwa' },
    { id: 'e8', date: '2026-05-03', category: 'Deliveries', description: 'Local delivery fees - week 1', amount: 30000, addedBy: 'Rustick Mbilauli' },
    { id: 'e9', date: '2026-05-01', category: 'Miscellaneous', description: 'Office supplies', amount: 70000, addedBy: 'Rhoda Mutafungwa' },
  ],

  employees: [
    { id: 'emp1', name: 'Rhoda Mutafungwa', role: 'Admin', phone: '+255 712 345 678', username: 'rhoda.mutafungwa', status: 'Active', initials: 'RM', color: '#C92B36' },
    { id: 'emp2', name: 'Rustick Mbilauli', role: 'Cashier', phone: '+255 754 901 234', username: 'rustick.mbilauli', status: 'Active', initials: 'RM', color: '#1E4E8C' },
    { id: 'emp3', name: 'Neema Juma', role: 'Cashier', phone: '+255 765 432 100', username: 'neema.juma', status: 'Inactive', initials: 'NJ', color: '#1E4E8C' },
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

const DATA_VERSION = '2'

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
