import { MinusIcon } from "../icons/MinusIcon"
import { PlusIcon } from "../icons/PlusIcon"

interface QuantityStepperProps {
  value: number
  max: number
  onChange: (value: number) => void
  label?: string
}

export function QuantityStepper({
  value,
  max,
  onChange,
  label = "Cantidad",
}: QuantityStepperProps) {
  return (
    <fieldset className="inline-flex items-stretch border-2 border-steel" aria-label={label}>
      <button
        type="button"
        className="flex min-h-11 min-w-11 items-center justify-center text-paper transition-colors hover:bg-steel disabled:opacity-30"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Quitar una unidad"
      >
        <MinusIcon />
      </button>
      <span className="flex min-w-11 items-center justify-center font-display text-xl tabular-nums">
        {value}
      </span>
      <button
        type="button"
        className="flex min-h-11 min-w-11 items-center justify-center text-paper transition-colors hover:bg-steel disabled:opacity-30"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Agregar una unidad"
      >
        <PlusIcon />
      </button>
    </fieldset>
  )
}
