import { type FormEvent, useState } from "react"
import { Link } from "react-router"
import { ApiError } from "../api/client"
import { createOrder, type Order, type ShippingMethod } from "../api/orders"
import { CartSummary } from "../components/cart/CartSummary"
import { EmptyCart } from "../components/cart/EmptyCart"
import { CheckoutForm } from "../components/checkout/CheckoutForm"
import { OrderConfirmation } from "../components/checkout/OrderConfirmation"
import { useCart } from "../hooks/useCart"
import { useMeta } from "../hooks/useMeta"

export function CheckoutPage() {
  const { lines, itemCount, subtotal, clear } = useCart()
  const meta = useMeta()
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("despacho")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)

  const shippingCost = shippingMethod === "retiro" ? 0 : meta.shippingFlatClp

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    setError(null)

    try {
      const created = await createOrder({
        customerName: `${form.get("nombre")} ${form.get("apellido")}`.trim(),
        customerEmail: String(form.get("correo") ?? ""),
        phone: String(form.get("telefono") ?? ""),
        shippingMethod,
        address: String(form.get("direccion") ?? "") || undefined,
        city: String(form.get("comuna") ?? "") || undefined,
        region: String(form.get("region") ?? "") || undefined,
        items: lines.map((line) => ({ releaseId: line.release.id, quantity: line.quantity })),
      })

      setOrder(created)
      clear()
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.issues?.length ? caught.issues.join(" · ") : caught.message)
      } else {
        setError("No pudimos enviar el pedido. ¿Está corriendo la API?")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (order) {
    return (
      <section className="px-4 py-8 sm:px-6">
        <h1 className="border-b-2 border-paper pb-4 font-display text-5xl uppercase sm:text-6xl">
          Pedido listo
        </h1>
        <div className="mt-8 max-w-2xl">
          <OrderConfirmation order={order} />
        </div>
      </section>
    )
  }

  if (lines.length === 0) {
    return (
      <section className="px-4 py-8 sm:px-6">
        <h1 className="border-b-2 border-paper pb-4 font-display text-5xl uppercase">Checkout</h1>
        <div className="mt-8">
          <EmptyCart />
        </div>
      </section>
    )
  }

  return (
    <section className="px-4 py-8 sm:px-6">
      <h1 className="border-b-2 border-paper pb-4 font-display text-5xl uppercase sm:text-6xl">
        Checkout
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <CheckoutForm
          shippingMethod={shippingMethod}
          shippingCost={meta.shippingFlatClp}
          submitting={submitting}
          error={error}
          onShippingChange={setShippingMethod}
          onSubmit={handleSubmit}
        />

        <div className="flex flex-col gap-4">
          <CartSummary subtotal={subtotal} itemCount={itemCount} shippingCost={shippingCost} />
          <ul className="flex flex-col gap-2 border-2 border-ash p-4 text-sm text-muted">
            {lines.map((line) => (
              <li key={line.release.id} className="flex justify-between gap-3">
                <span className="truncate">
                  {line.quantity}× {line.release.title}
                </span>
                <Link to={`/disco/${line.release.id}`} className="label shrink-0 hover:text-volt">
                  Ver
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
