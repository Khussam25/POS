import { formatPhoneInput } from '../utils/phone'

const baseStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  outline: 'none',
  fontSize: 13,
  lineHeight: '1.25',
  boxSizing: 'border-box',
  background: 'var(--bg)',
  color: 'var(--text-900)',
  border: '1.5px solid var(--outline)',
  transition: 'border-color 0.15s',
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
  ...rest
}) {
  const inputType = numeric || phone ? 'text' : type
  // Use numeric keyboard for phone — inputMode "tel" can render taller on some browsers
  const inputMode = phone ? 'numeric' : numeric ? 'decimal' : undefined
  const shouldSelect = selectOnFocus && !disabled && type !== 'password' && type !== 'date'

  return (
    <input
      {...rest}
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
