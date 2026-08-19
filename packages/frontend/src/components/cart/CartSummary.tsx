import type { ReactNode } from "react"
import { formatPrice } from "../../lib/format"

interface CartSummaryProps {
  subtotal: number
  itemCount: number
  /** Costo de despacho ya resuelto por el llamador (0 = retiro en tienda). */
  shippingCost?: number
  action?: ReactNode
}

export function CartSummary({ subtotal, itemCount, shippingCost, action }: CartSummaryProps) {
  const knownShipping = shippingCost !== undefined
  const total = subtotal + (shippingCost ?? 0)

  return (
    <aside className="flex flex-col gap-4 border-2 border-paper p-5">
      <h2 className="font-display text-2xl uppercase">Resumen</h2>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">
            {itemCount} {itemCount === 1 ? "disco" : "discos"}
          </span>
          <span className="tabular-nums">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Despacho</span>
          <span className="tabular-nums">
            {knownShipping ? formatPrice(shippingCost) : "Se calcula al pagar"}
          </span>
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t-2 border-paper pt-4">
        <span className="label">{knownShipping ? "Total" : "Subtotal"}</span>
        <span className="font-display text-3xl text-volt tabular-nums">{formatPrice(total)}</span>
      </div>

      {action}
    </aside>
  )
}
