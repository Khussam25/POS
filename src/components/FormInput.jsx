import { formatPhoneInput } from '../utils/phone'

/**
 * Controlled text input that allows clearing and retyping.
 * Use `numeric` instead of type="number" — number inputs fight React when empty.
 * Sizing is in index.css (.form-input) — avoid overriding padding/height inline.
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
  variant,
  style,
  onFocus,
  onBlur,
  className,
  ...rest
}) {
  const inputType = numeric || phone ? 'text' : type
  const inputMode = phone ? 'numeric' : numeric ? 'decimal' : undefined
  const shouldSelect = selectOnFocus && !disabled && type !== 'password' && type !== 'date'

  const classes = [
    'form-input',
    error && 'form-input--error',
    variant === 'search' && 'form-input--search',
    variant === 'compact' && 'form-input--compact',
    className,
  ].filter(Boolean).join(' ')

  return (
    <input
      {...rest}
      className={classes}
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
      style={style}
      onFocus={e => {
        if (shouldSelect) e.target.select()
        onFocus?.(e)
      }}
      onBlur={onBlur}
    />
  )
}
