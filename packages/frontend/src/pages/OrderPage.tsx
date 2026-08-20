import { useCallback, useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import { fetchOrder, type Order, startPayment } from "../api/orders"
import { OrderConfirmation } from "../components/checkout/OrderConfirmation"
import { Button } from "../components/ui/Button"
import { ErrorState, LoadingState } from "../components/ui/StateMessage"

/** Lo que se le dice al cliente según cómo volvió de Mercado Pago. */
const RETURN_MESSAGES: Record<string, string> = {
  exito: "Estamos confirmando tu pago con Mercado Pago.",
  pendiente: "Mercado Pago dejó el pago en revisión. Te avisaremos en cuanto se acredite.",
  fallo: "El pago no se completó. Puedes intentarlo otra vez cuando quieras.",
}

const PAYMENT_LABEL: Record<string, string> = {
  sin_iniciar: "Sin pagar",
  pendiente: "Pago en proceso",
  aprobado: "Pago acreditado",
  rechazado: "Pago rechazado",
  anulado: "Pago anulado",
  reembolsado: "Pago reembolsado",
}

export function OrderPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!id) return Promise.resolve()
      return fetchOrder(id, signal)
        .then(setOrder)
        .catch(() => setError("No encontramos este pedido"))
    },
    [id],
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  // El aviso de Mercado Pago tarda unos segundos: se refresca hasta que se acredite.
  useEffect(() => {
    if (order?.paymentStatus !== "pendiente") return
    const timer = setTimeout(() => void load(), 4000)
    return () => clearTimeout(timer)
  }, [order, load])

  async function handleRetry() {
    if (!id) return
    setRetrying(true)
    try {
      const { initPoint } = await startPayment(id)
      window.location.href = initPoint
    } catch {
      setError("No pudimos reabrir el pago")
      setRetrying(false)
    }
  }

  const returnMessage = RETURN_MESSAGES[searchParams.get("estado") ?? ""]
  const canRetry = order?.status === "pendiente" && order.paymentStatus !== "aprobado"

  return (
    <section className="px-4 py-8 sm:px-6">
      <h1 className="border-b-2 border-paper pb-4 font-display text-5xl uppercase sm:text-6xl">
        Tu pedido
      </h1>

      <div className="mt-8 flex max-w-2xl flex-col gap-6">
        {returnMessage ? (
          <p className="border-2 border-volt p-4 text-sm text-volt" role="status">
            {returnMessage}
          </p>
        ) : null}

        {error ? <ErrorState message={error} /> : null}
        {!order && !error ? <LoadingState label="Cargando el pedido" /> : null}

        {order ? (
          <>
            <div className="flex items-center justify-between border-2 border-ash p-4">
              <div>
                <p className="label text-muted">Estado del pago</p>
                <p className="mt-1 font-display text-2xl uppercase text-volt">
                  {PAYMENT_LABEL[order.paymentStatus]}
                </p>
              </div>
              {order.paymentStatus === "pendiente" ? (
                <span className="label text-muted">Actualizando…</span>
              ) : null}
            </div>

            <OrderConfirmation order={order} />

            {canRetry ? (
              <Button onClick={handleRetry} disabled={retrying}>
                {retrying ? "Abriendo Mercado Pago…" : "Pagar ahora"}
              </Button>
            ) : null}

            <Link to="/catalogo" viewTransition className="label text-volt hover:text-paper">
              Seguir mirando discos
            </Link>
          </>
        ) : null}
      </div>
    </section>
  )
}
