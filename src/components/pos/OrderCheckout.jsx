import { useState } from 'react'
import FormInput from '../FormInput'
import { Banknote, Smartphone, CreditCard, FileText, ChevronUp, ChevronDown } from 'lucide-react'

const PAYMENT_METHODS = [
  { key: 'Cash', labelKey: 'cash', icon: Banknote },
  { key: 'Mobile Money', labelKey: 'mobileMoney', icon: Smartphone },
  { key: 'Card', labelKey: 'card', icon: CreditCard },
]

function fmt(n) {
  return 'TZS ' + Number(n).toLocaleString()
}

/** Shared checkout UI — desktop full layout; mobile compact collapsible panel. */
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
  compact = false,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  const totalsBlock = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: compact ? 6 : 8, fontSize: compact ? 12 : 13 }}>
        <span style={{ color: 'var(--text-500)' }}>{t('subtotal')}</span>
        <span style={{ fontWeight: 500 }}>{fmt(subtotal)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: compact ? 6 : 8, gap: 8 }}>
        <span style={{ fontSize: compact ? 12 : 13, color: 'var(--text-500)', flexShrink: 0 }}>{t('discountTZS')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FormInput
            numeric
            variant="compact"
            value={discountValue}
            onChange={e => setDiscountValue(e.target.value)}
            placeholder="0"
            style={{ width: compact ? 72 : 90, textAlign: 'right' }}
          />
          {discountAmount > 0 && (
            <span style={{ fontSize: compact ? 11 : 13, fontWeight: 600, color: 'var(--success)', whiteSpace: 'nowrap' }}>
              - {fmt(discountAmount)}
            </span>
          )}
        </div>
      </div>
      {vatEnabled && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: compact ? 6 : 8, fontSize: compact ? 12 : 13 }}>
          <span style={{ color: 'var(--text-500)' }}>{t('tax')} ({vatRate}%)</span>
          <span style={{ fontWeight: 500 }}>{fmt(vat)}</span>
        </div>
      )}
    </>
  )

  const customerBlock = (
    <div style={{ marginTop: compact ? 8 : 0 }}>
      {!compact && (
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          {t('customerDetails')}
        </div>
      )}
      {compact && (
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-500)', marginBottom: 6 }}>{t('customerDetails')}</div>
      )}
      <div style={{ display: 'flex', gap: 8, flexDirection: compact ? 'column' : 'row', flexWrap: compact ? 'nowrap' : 'wrap' }}>
        <FormInput variant="compact" value={customer} onChange={e => setCustomer(e.target.value)} placeholder={t('nameLabel')}
          style={{ flex: compact ? 'none' : '1 1 120px', width: compact ? '100%' : undefined, background: 'var(--surface)', minWidth: 0 }} />
        <FormInput variant="compact" phone value={phone} onChange={e => setPhone(e.target.value)} placeholder="+255 712 345 678"
          style={{ flex: compact ? 'none' : '1 1 120px', width: compact ? '100%' : undefined, background: 'var(--surface)', minWidth: 0 }} />
      </div>
    </div>
  )

  const paymentBlock = (
    <div style={{ marginTop: compact ? 10 : 0 }}>
      {!compact && (
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-500)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          {t('paymentMethod')}
        </div>
      )}
      {compact && (
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-500)', marginBottom: 6 }}>{t('paymentMethod')}</div>
      )}
      <div style={{ display: 'flex', gap: compact ? 6 : 7 }}>
        {PAYMENT_METHODS.map(({ key, labelKey, icon: Icon }) => {
          const active = payment === key
          return (
            <button key={key} type="button" onClick={() => setPayment(key)} style={{
              flex: 1, padding: compact ? '7px 2px' : '9px 4px', borderRadius: compact ? 8 : 10, fontSize: 10, fontWeight: 700,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 3 : 5,
              border: `2px solid ${active ? 'var(--primary)' : 'var(--outline)'}`,
              background: active ? 'var(--primary-soft)' : 'var(--surface)',
              color: active ? 'var(--primary)' : 'var(--text-500)',
            }}>
              <Icon size={compact ? 14 : 16} strokeWidth={active ? 2.2 : 1.8} />
              {t(labelKey)}
            </button>
          )
        })}
      </div>
    </div>
  )

  const actionButtons = (
    <div style={{ display: 'flex', gap: 8, marginTop: compact ? 10 : 0 }}>
      <button type="button" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: compact ? '10px 12px' : '12px 14px',
        border: '2px solid var(--outline)', borderRadius: 'var(--radius-sm)',
        background: 'var(--surface)', color: 'var(--text-900)', fontWeight: 600, fontSize: compact ? 12 : 13,
        flexShrink: 0,
      }}>
        <FileText size={compact ? 14 : 15} /> {!compact && t('receipt')}
      </button>
      <button type="button" onClick={onCompleteSale} disabled={cart.length === 0} style={{
        flex: 1, padding: compact ? '10px' : '12px', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: compact ? 13 : 14,
        background: cart.length === 0 ? 'var(--outline)' : 'var(--primary)',
        color: cart.length === 0 ? 'var(--text-500)' : 'white',
      }}>
        {t('completeSale')}
      </button>
    </div>
  )

  if (compact) {
    return (
      <div style={{ flexShrink: 0, background: 'var(--surface)', borderTop: '2px solid var(--outline)', boxShadow: '0 -4px 16px rgba(26,35,50,0.08)' }}>
        {detailsOpen && (
          <div style={{
            maxHeight: '36vh', overflowY: 'auto', padding: '10px 12px 12px',
            borderBottom: '1px solid var(--outline)', background: 'var(--bg)',
          }}>
            {totalsBlock}
            {customerBlock}
            {paymentBlock}
          </div>
        )}

        <div style={{ padding: '10px 12px 12px' }}>
          <button
            type="button"
            onClick={() => setDetailsOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '6px 0', marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--primary)', background: 'transparent',
            }}
          >
            {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {detailsOpen ? t('hideDetails') : t('showDetails')}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-900)' }}>{t('total')}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>{fmt(total)}</span>
          </div>

          {actionButtons}
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: '16px 18px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--outline)' }}>
        {totalsBlock}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1.5px solid var(--outline)' }}>
          <span style={{ fontSize: 17, fontWeight: 800 }}>{t('total')}</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{fmt(total)}</span>
        </div>
      </div>

      <div style={{ padding: '12px 14px', background: 'var(--bg)', borderBottom: '1px solid var(--outline)' }}>
        {customerBlock}
      </div>

      <div style={{ padding: '12px 14px', background: 'var(--bg)', borderBottom: '1px solid var(--outline)' }}>
        {paymentBlock}
      </div>

      <div style={{ padding: '12px 14px', background: 'var(--bg)' }}>
        {actionButtons}
      </div>
    </>
  )
}
