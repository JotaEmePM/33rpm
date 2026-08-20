interface FieldProps {
  label: string
  name: string
  type?: string
  autoComplete?: string
  required?: boolean
  className?: string
  /** Con `value` + `onChange` el campo pasa a ser controlado. */
  value?: string
  onChange?: (value: string) => void
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  className = "",
  value,
  onChange,
}: FieldProps) {
  const controlled = value !== undefined && onChange !== undefined

  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="label text-muted">{label}</span>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        required={required}
        value={controlled ? value : undefined}
        onChange={controlled ? (event) => onChange(event.target.value) : undefined}
        className="min-h-12 border-2 border-steel bg-transparent px-3 text-paper focus:border-volt focus:outline-none"
      />
    </label>
  )
}
