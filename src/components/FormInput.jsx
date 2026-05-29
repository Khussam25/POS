import { formatPhoneInput } from '../utils/phone'

const INPUT_HEIGHT = 38
const BORDER_W = 1.5
/** Inner line box (height minus top/bottom border) for vertical centering. */
const INPUT_LINE_HEIGHT = INPUT_HEIGHT - BORDER_W * 2

const baseStyle = {
  width: '100%',
  height: INPUT_HEIGHT,
  padding: '0 12px',
  borderRadius: 8,
  outline: 'none',
  fontSize: 13,
  lineHeight: `${INPUT_LINE_HEIGHT}px`,
  boxSizing: 'border-box',
  background: 'var(--bg)',
  color: 'var(--text-900)',
  border: `${BORDER_W}px solid var(--outline)`,
  transition: 'border-color 0.15s',
}

const dateStyle = {
  lineHeight: '1.25',
  padding: '8px 12px',
}

/**
 * Controlled text input that allows clearing and retyping.
 * Use `numeric` instead of type="number" — number inputs fight React when empty.
 */
export default function FormInput({
  value,
  onChange,
  type = 'text',
  numeric = false,
  phone = false,
  placeholder,
  disabled = false,
  error = false,
  selectOnFocus = false,
  autoFocus = false,
  style,
  onFocus,
  onBlur,
  className,
  ...rest
}) {
  const inputType = numeric || phone ? 'text' : type
  // Use numeric keyboard for phone — inputMode "tel" can render taller on some browsers
  const inputMode = phone ? 'numeric' : numeric ? 'decimal' : undefined
  const shouldSelect = selectOnFocus && !disabled && type !== 'password' && type !== 'date'

  const isDate = type === 'date'

  return (
    <input
      {...rest}
      className={['form-input', className].filter(Boolean).join(' ')}
      type={inputType}
      inputMode={inputMode}
      value={value ?? ''}
      onChange={e => {
        if (!phone) {
          onChange?.(e)
          return
        }
        const formatted = formatPhoneInput(e.target.value)
        onChange?.({ ...e, target: { ...e.target, value: formatted } })
      }}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      autoComplete="off"
      style={{
        ...baseStyle,
        ...(isDate ? dateStyle : null),
        ...style,
        borderColor: error ? 'var(--danger)' : (style?.borderColor ?? 'var(--outline)'),
        background: disabled ? 'var(--bg)' : (style?.background ?? 'var(--bg)'),
        color: disabled ? 'var(--text-500)' : 'var(--text-900)',
      }}
      onFocus={e => {
        if (shouldSelect) e.target.select()
        if (!error && !disabled) e.target.style.borderColor = 'var(--primary)'
        onFocus?.(e)
      }}
      onBlur={e => {
        if (!error) e.target.style.borderColor = 'var(--outline)'
        onBlur?.(e)
      }}
    />
  )
}
