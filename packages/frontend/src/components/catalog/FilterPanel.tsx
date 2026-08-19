import { FilterGroup } from "./FilterGroup"

export interface CatalogFilters {
  formats: string[]
  conditions: string[]
  onlyInStock: boolean
}

interface FilterPanelProps {
  filters: CatalogFilters
  formatOptions: string[]
  conditionOptions: string[]
  onChange: (filters: CatalogFilters) => void
  onReset: () => void
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export function FilterPanel({
  filters,
  formatOptions,
  conditionOptions,
  onChange,
  onReset,
}: FilterPanelProps) {
  return (
    <aside className="flex flex-col gap-4 border-2 border-ash p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl uppercase">Filtros</h2>
        <button
          type="button"
          onClick={onReset}
          className="label min-h-11 px-2 text-muted transition-colors hover:text-volt"
        >
          Limpiar
        </button>
      </div>

      <FilterGroup
        title="Formato"
        options={formatOptions}
        selected={filters.formats}
        onToggle={(option) => onChange({ ...filters, formats: toggle(filters.formats, option) })}
      />

      <FilterGroup
        title="Estado"
        options={conditionOptions}
        selected={filters.conditions}
        onToggle={(option) =>
          onChange({ ...filters, conditions: toggle(filters.conditions, option) })
        }
      />

      <label className="flex min-h-11 cursor-pointer items-center gap-3 border-t border-ash pt-4 text-sm">
        <input
          type="checkbox"
          checked={filters.onlyInStock}
          onChange={() => onChange({ ...filters, onlyInStock: !filters.onlyInStock })}
          className="size-4 shrink-0 appearance-none border-2 border-steel checked:border-volt checked:bg-volt"
        />
        Solo con stock
      </label>
    </aside>
  )
}
