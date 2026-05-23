type RetroInputProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: 'text' | 'email'
  invalid?: boolean
}

export default function RetroInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  invalid = false
}: RetroInputProps) {
  return (
    <div className="retro-field">
      <label className="retro-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className={`retro-input ${invalid ? 'invalid' : ''}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </div>
  )
}
