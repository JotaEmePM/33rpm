interface SelectProps {
  label: string
  name: string
  options: readonly string[]
  defaultValue?: string
  className?: string
}

export function Select({ label, name, options, defaultValue, className = "" }: SelectProps) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="label text-muted">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="min-h-12 border-2 border-steel bg-ink px-3 text-paper focus:border-volt focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
