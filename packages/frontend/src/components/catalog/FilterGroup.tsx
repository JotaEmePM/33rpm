interface FilterGroupProps {
  title: string
  options: readonly string[]
  selected: string[]
  onToggle: (option: string) => void
}

export function FilterGroup({ title, options, selected, onToggle }: FilterGroupProps) {
  return (
    <fieldset className="flex flex-col gap-2 border-t border-ash pt-4">
      <legend className="label pb-2 text-volt">{title}</legend>
      {options.map((option) => (
        <label
          key={option}
          className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-paper"
        >
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => onToggle(option)}
            className="size-4 shrink-0 appearance-none border-2 border-steel checked:border-volt checked:bg-volt"
          />
          {option}
        </label>
      ))}
    </fieldset>
  )
}
