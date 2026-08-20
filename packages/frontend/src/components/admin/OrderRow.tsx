import { useState } from "react"
import { ORDER_STATUSES, type Order, type OrderStatus } from "../../api/orders"
import { formatPrice } from "../../lib/format"
import { Badge } from "../ui/Badge"

/** Cómo se lee cada estado de cobro en la tabla. */
const PAYMENT_LABEL: Record<string, string> = {
  sin_iniciar: "Sin pagar",
  pendiente: "En proceso",
  aprobado: "Acreditado",
  rechazado: "Rechazado",
  anulado: "Anulado",
  reembolsado: "Reembolsado",
}

interface OrderRowProps {
  order: Order
  busy: boolean
  onStatusChange: (order: Order, status: OrderStatus) => void
}

export function OrderRow({ order, busy, onStatusChange }: OrderRowProps) {
  const [open, setOpen] = useState(false)
  const units = order.items.reduce((total, item) => total + item.quantity, 0)

  return (
    <>
      <tr className="border-t border-ash align-top">
        <td className="p-3">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="text-left font-display text-lg uppercase transition-colors hover:text-volt"
          >
            #{order.id.slice(0, 8)}
          </button>
          <p className="text-sm text-muted">{order.createdAt}</p>
        </td>
        <td className="p-3">
          <p className="text-sm">{order.customerName}</p>
          <p className="text-sm text-muted">{order.customerEmail}</p>
        </td>
        <td className="p-3 text-sm">
          {order.shippingMethod === "retiro" ? "Retiro" : "Despacho"}
          {order.city ? <span className="block text-muted">{order.city}</span> : null}
        </td>
        <td className="p-3 text-right text-sm">
          {units} {units === 1 ? "disco" : "discos"}
        </td>
        <td className="p-3 text-right tabular-nums">{formatPrice(order.total)}</td>
        <td className="p-3 text-right">
          <Badge tone={order.paymentStatus === "aprobado" ? "volt" : "outline"}>
            {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
          </Badge>
        </td>
        <td className="p-3 text-right">
          <select
            value={order.status}
            disabled={busy}
            onChange={(event) => onStatusChange(order, event.target.value as OrderStatus)}
            aria-label={`Estado del pedido ${order.id.slice(0, 8)}`}
            className="min-h-11 border-2 border-steel bg-ink px-2 text-sm text-paper focus:border-volt focus:outline-none disabled:opacity-40"
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </td>
      </tr>

      {open ? (
        <tr className="border-t border-ash bg-smoke">
          <td colSpan={7} className="p-3">
            <ul className="flex flex-col gap-1 text-sm">
              {order.items.map((item) => (
                <li key={item.releaseId} className="flex justify-between gap-4">
                  <span>
                    {item.quantity} × {item.artist} — {item.title}
                  </span>
                  <span className="tabular-nums text-muted">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-col gap-1 text-sm text-muted">
              <span>
                Despacho: {formatPrice(order.shippingCost)} · Teléfono: {order.phone}
              </span>
              {order.address ? (
                <span>
                  Dirección: {order.address}
                  {order.city ? `, ${order.city}` : ""}
                  {order.region ? `, ${order.region}` : ""}
                </span>
              ) : null}
              {order.paymentId ? <span>Pago Mercado Pago: {order.paymentId}</span> : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}
