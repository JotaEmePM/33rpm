import { useCallback, useEffect, useState } from "react"
import {
  fetchOrders,
  ORDER_STATUSES,
  type Order,
  type OrderStatus,
  updateOrderStatus,
} from "../../api/orders"
import { AdminHeader } from "../../components/admin/AdminHeader"
import { OrderRow } from "../../components/admin/OrderRow"
import { ErrorState, LoadingState } from "../../components/ui/StateMessage"
import { formatPrice } from "../../lib/format"

const COLUMNS = ["Pedido", "Cliente", "Entrega", "Discos", "Total", "Pago", "Estado"]

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<OrderStatus | "todos">("todos")
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback((signal?: AbortSignal) => {
    return fetchOrders(signal)
      .then((result) => setOrders(result.items))
      .catch(() => setError("No pudimos cargar los pedidos"))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function handleStatusChange(order: Order, status: OrderStatus) {
    setBusyId(order.id)
    setError(null)
    try {
      const updated = await updateOrderStatus(order.id, status)
      // Se sustituye sólo el pedido tocado: recargar la tabla entera perdería el detalle abierto.
      setOrders((current) =>
        (current ?? []).map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch {
      setError("No pudimos cambiar el estado del pedido")
    } finally {
      setBusyId(null)
    }
  }

  const all = orders ?? []
  const visible = filter === "todos" ? all : all.filter((order) => order.status === filter)
  const pending = all.filter((order) => order.status === "pendiente").length
  const billed = all
    .filter((order) => order.status === "pagado" || order.status === "enviado")
    .reduce((total, order) => total + order.total, 0)

  return (
    <>
      <AdminHeader title="Pedidos" />

      <section className="flex flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="label text-muted">Pedidos</p>
            <p className="font-display text-4xl">{orders ? all.length : "—"}</p>
          </div>
          <div>
            <p className="label text-muted">Por atender</p>
            <p className="font-display text-4xl text-volt">{orders ? pending : "—"}</p>
          </div>
          <div>
            <p className="label text-muted">Cobrado</p>
            <p className="font-display text-4xl">{orders ? formatPrice(billed) : "—"}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {(["todos", ...ORDER_STATUSES] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`label min-h-11 border-2 px-3 transition-colors ${
                filter === option
                  ? "border-volt text-volt"
                  : "border-ash text-muted hover:border-paper hover:text-paper"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {error ? <ErrorState message={error} /> : null}
        {!orders && !error ? <LoadingState label="Cargando pedidos" /> : null}

        {orders && visible.length === 0 ? (
          <p className="border-2 border-ash p-10 text-center text-muted">
            {all.length === 0 ? "Todavía no hay pedidos." : "Ningún pedido en ese estado."}
          </p>
        ) : null}

        {visible.length > 0 ? (
          <div className="overflow-x-auto border-2 border-ash">
            <table className="w-full min-w-3xl border-collapse text-left">
              <thead>
                <tr className="bg-smoke">
                  {COLUMNS.map((column, index) => (
                    <th
                      key={column}
                      scope="col"
                      className={`label p-3 text-muted ${index >= 3 ? "text-right" : ""}`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    busy={busyId === order.id}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </>
  )
}
