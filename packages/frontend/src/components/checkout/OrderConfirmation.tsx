import type { Order } from "../../api/orders"
import { formatPrice } from "../../lib/format"

interface OrderConfirmationProps {
  order: Order
  /** Sin pasarela el pedido queda pendiente a propósito; con ella, es que el cobro falló. */
  paymentsEnabled: boolean
}

/** Recibo del pedido. Las acciones las pone quien lo muestra: aquí sólo se informa. */
export function OrderConfirmation({ order, paymentsEnabled }: OrderConfirmationProps) {
  const nota =
    order.paymentStatus === "aprobado"
      ? "Pago confirmado. Preparamos el envío y te escribimos al correo del pedido."
      : paymentsEnabled
        ? "Guardamos los discos 48 horas mientras se completa el pago."
        : "Guardamos los discos 48 horas. El pago todavía no está conectado, así que el pedido queda pendiente."

  return (
    <div className="flex flex-col items-start gap-6 border-2 border-volt p-8">
      <p className="label text-volt">Pedido {order.status}</p>
      <h2 className="font-display text-4xl uppercase leading-tight sm:text-5xl">
        Reservamos tus discos
      </h2>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex gap-3">
          <dt className="text-muted">Número</dt>
          <dd className="tabular-nums">{order.id}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-muted">Correo</dt>
          <dd>{order.customerEmail}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-muted">Total</dt>
          <dd className="font-display text-xl text-volt">{formatPrice(order.total)}</dd>
        </div>
      </dl>

      <ul className="flex w-full flex-col gap-2 border-t border-ash pt-4 text-sm">
        {order.items.map((item) => (
          <li key={item.releaseId} className="flex justify-between gap-3">
            <span className="truncate">
              {item.quantity}× {item.title} — {item.artist}
            </span>
            <span className="tabular-nums">{formatPrice(item.unitPrice * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm text-muted">{nota}</p>
    </div>
  )
}
