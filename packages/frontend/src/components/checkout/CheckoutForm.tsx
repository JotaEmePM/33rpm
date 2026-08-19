import type { FormEvent } from "react"
import type { ShippingMethod } from "../../api/orders"
import { Button } from "../ui/Button"
import { Field } from "../ui/Field"
import { ShippingOptions } from "./ShippingOptions"

interface CheckoutFormProps {
  shippingMethod: ShippingMethod
  shippingCost: number
  submitting: boolean
  error: string | null
  onShippingChange: (method: ShippingMethod) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function CheckoutForm({
  shippingMethod,
  shippingCost,
  submitting,
  error,
  onShippingChange,
  onSubmit,
}: CheckoutFormProps) {
  const needsAddress = shippingMethod === "despacho"

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="font-display text-2xl uppercase">Contacto</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" name="nombre" autoComplete="given-name" />
          <Field label="Apellido" name="apellido" autoComplete="family-name" />
          <Field label="Correo" name="correo" type="email" autoComplete="email" />
          <Field label="Teléfono" name="telefono" type="tel" autoComplete="tel" />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-display text-2xl uppercase">Entrega</legend>
        <ShippingOptions
          value={shippingMethod}
          shippingCost={shippingCost}
          onChange={onShippingChange}
        />
        {needsAddress ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Dirección"
              name="direccion"
              autoComplete="street-address"
              className="sm:col-span-2"
            />
            <Field label="Comuna" name="comuna" autoComplete="address-level2" />
            <Field label="Región" name="region" autoComplete="address-level1" />
          </div>
        ) : null}
      </fieldset>

      {error ? (
        <p className="border-2 border-volt p-4 text-sm text-volt" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? "Confirmando…" : "Confirmar pedido"}
      </Button>
      <p className="label text-muted">
        El pedido queda pendiente de pago — falta conectar la pasarela
      </p>
    </form>
  )
}
