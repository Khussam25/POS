import FormInput from '../FormInput'
import { Banknote, Smartphone, CreditCard, FileText } from 'lucide-react'

const PAYMENT_METHODS = [
  { key: 'Cash', labelKey: 'cash', icon: Banknote },
  { key: 'Mobile Money', labelKey: 'mobileMoney', icon: Smartphone },
  { key: 'Card', labelKey: 'card', icon: CreditCard },
]

function fmt(n) {
  return 'TZS ' + Number(n).toLocaleString()
}

/** Shared checkout UI — used by mobile and desktop POS so both stay in sync. */
export default function OrderCheckout({
  t,
  cart,
  subtotal,
  vat,
  vatRate,
  vatEnabled,
  discountValue,
  setDiscountValue,
  discountAmount,
  total,
  customer,
  setCustomer,
  phone,
  setPhone,
  payment,
  setPayment,
  onCompleteSale,
}) {
  return (
    <>
      <div style={{ padding: '16px 18px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--outline)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--text-500)' }}>{t('subtotal')}</span>
          <span style={{ fontWeight: 500 }}>{fmt(subtotal)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-500)', flexShrink: 0 }}>{t('discountTZS')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FormInput
              numeric
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              placeholder="0"
              style={{ width: 90, padding: '5px 8px', borderRadius: 7, fontSize: 13, textAlign: 'right', background: 'var(--bg)' }}
            />
            {discountAmount > 0 && (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', whiteSpace: 'nowrap' }}>
                - {fmt(discountAmount)}
              </span>
            )}
          </div>
        </div>

        {vatEnabled && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--text-500)' }}>{t('tax')} ({vatRate}%)</span>
            <span style={{ fontWeight: 500 }}>{fmt(vat)}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1.5px solid var(--outline)' }}>
          <span style={{ fontSize: 17, fontWeight: 800 }}>{t('total')}</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{fmt(total)}</span>
        </div>
      </div>

      <div style={{ padding: '12px 14px', background: 'var(--bg)', borderBottom: '1px solid var(--outline)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          {t('customerDetails')}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <FormInput value={customer} onChange={e => setCustomer(e.target.value)} placeholder={t('nameLabel')}
            style={{ flex: '1 1 120px', padding: '9px 10px', fontSize: 12, background: 'var(--surface)', minWidth: 0 }} />
          <FormInput phone value={phone} onChange={e => setPhone(e.target.value)} placeholder="+255 712 345 678"
            style={{ flex: '1 1 120px', padding: '9px 10px', fontSize: 12, background: 'var(--surface)', minWidth: 0 }} />
        </div>
      </div>

      <div style={{ padding: '12px 14px', background: 'var(--bg)', borderBottom: '1px solid var(--outline)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          {t('paymentMethod')}
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          {PAYMENT_METHODS.map(({ key, labelKey, icon: Icon }) => {
            const active = payment === key
            return (
              <button key={key} type="button" onClick={() => setPayment(key)} style={{
                flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                border: `2px solid ${active ? 'var(--primary)' : 'var(--outline)'}`,
                background: active ? 'var(--primary-soft)' : 'var(--surface)',
                color: active ? 'var(--primary)' : 'var(--text-500)',
                transition: 'all 0.15s',
              }}>
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                {t(labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '12px 14px', background: 'var(--bg)', display: 'flex', gap: 8 }}>
        <button type="button" style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '12px 14px',
          border: '2px solid var(--outline)', borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)', color: 'var(--text-900)', fontWeight: 600, fontSize: 13,
          flexShrink: 0,
        }}>
          <FileText size={15} /> {t('receipt')}
        </button>
        <button type="button" onClick={onCompleteSale} disabled={cart.length === 0} style={{
          flex: 1, padding: '12px', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 14,
          background: cart.length === 0 ? 'var(--outline)' : 'var(--primary)',
          color: cart.length === 0 ? 'var(--text-500)' : 'white',
        }}>
          {t('completeSale')}
        </button>
      </div>
    </>
  )
}
