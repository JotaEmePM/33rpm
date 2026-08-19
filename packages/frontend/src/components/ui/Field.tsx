interface FieldProps {
  label: string
  name: string
  type?: string
  autoComplete?: string
  required?: boolean
  className?: string
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  className = "",
}: FieldProps) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="label text-muted">{label}</span>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        required={required}
        className="min-h-12 border-2 border-steel bg-transparent px-3 text-paper focus:border-volt focus:outline-none"
      />
    </label>
  )
}
