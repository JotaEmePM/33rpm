import type { ShippingMethod } from "../../api/orders"
import { formatPrice } from "../../lib/format"

interface ShippingOptionsProps {
  value: ShippingMethod
  shippingCost: number
  onChange: (value: ShippingMethod) => void
}

export function ShippingOptions({ value, shippingCost, onChange }: ShippingOptionsProps) {
  const options: { id: ShippingMethod; label: string; detail: string; price: number }[] = [
    { id: "retiro", label: "Retiro en tienda", detail: "[DIRECCIÓN] · 24 h hábiles", price: 0 },
    {
      id: "despacho",
      label: "Despacho a domicilio",
      detail: "2 a 5 días hábiles",
      price: shippingCost,
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option.id}
          className={`flex cursor-pointer flex-col gap-1 border-2 p-4 transition-colors ${
            value === option.id ? "border-volt bg-smoke" : "border-steel hover:border-paper"
          }`}
        >
          <input
            type="radio"
            name="entrega"
            value={option.id}
            checked={value === option.id}
            onChange={() => onChange(option.id)}
            className="sr-only"
          />
          <span className="label">{option.label}</span>
          <span className="text-sm text-muted">{option.detail}</span>
          <span className="font-display text-xl text-volt">
            {option.price === 0 ? "Sin costo" : formatPrice(option.price)}
          </span>
        </label>
      ))}
    </div>
  )
}
