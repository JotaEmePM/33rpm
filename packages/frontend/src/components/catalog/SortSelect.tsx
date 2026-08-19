export type SortOption = "recientes" | "precio-asc" | "precio-desc" | "artista"

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recientes", label: "Más recientes" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
  { value: "artista", label: "Artista (A–Z)" },
]

interface SortSelectProps {
  value: SortOption
  onChange: (value: SortOption) => void
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <label className="flex min-h-11 items-center gap-2 border-2 border-steel px-3 focus-within:border-volt">
      <span className="label text-muted">Ordenar</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortOption)}
        className="bg-ink text-sm text-paper focus:outline-none"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
