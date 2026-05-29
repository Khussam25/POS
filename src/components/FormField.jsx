import FormInput from './FormInput'

const ROW_INPUT_STYLE = {
  width: 280,
  maxWidth: '100%',
}

/**
 * Label + input group. Must live in its own file — defining Field inside a page
 * component remounts inputs on every keystroke and steals focus.
 */
export default function FormField({
  label,
  value,
  onChange,
  error,
  type = 'text',
  numeric = false,
  phone = false,
  placeholder,
  disabled = false,
  selectOnFocus = false,
  style,
  inputStyle,
  layout = 'stack',
  desc,
}) {
  const hasError = Boolean(error)
  const errorText = typeof error === 'string' ? error : ''

  const input = (
    <FormInput
      type={type}
      numeric={numeric}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      error={hasError}
      selectOnFocus={selectOnFocus}
      phone={phone}
      style={layout === 'row' ? { ...ROW_INPUT_STYLE, background: disabled ? 'var(--bg)' : 'var(--surface)', ...inputStyle } : inputStyle}
    />
  )

  if (layout === 'row') {
    return (
      <div className="form-field-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--outline)', ...style }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{label}</div>
          {desc && <div style={{ fontSize: 12, color: 'var(--text-500)' }}>{desc}</div>}
        </div>
        {input}
      </div>
    )
  }

  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: hasError ? 'var(--danger)' : 'var(--text-900)' }}>
        {label}{errorText ? ` — ${errorText}` : ''}
      </label>
      {input}
    </div>
  )
}
