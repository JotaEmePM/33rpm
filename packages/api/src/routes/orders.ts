import { type Request, type Response, Router } from "express"
import { env } from "../config/env.js"
import { param } from "../lib/http.js"
import { createPreference, isPaymentsConfigured } from "../lib/mercadopago.js"
import { ORDER_STATUSES, SHIPPING_METHODS, ValidationError, Validator } from "../lib/validation.js"
import { requireAdmin } from "../middleware/require-auth.js"
import { writeRateLimit } from "../middleware/security.js"
import {
  createOrder,
  getOrder,
  listOrders,
  type OrderDraft,
  setOrderPreference,
  updateOrderStatus,
} from "../repositories/orders.js"

export const ordersRouter: Router = Router()

function parseItems(value: unknown): OrderDraft["items"] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError(["items debe traer al menos un disco"])
  }

  return value.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new ValidationError([`items[${index}] debe ser un objeto`])
    }
    const validator = new Validator(entry as Record<string, unknown>)
    const releaseId = validator.string("releaseId", { max: 100 })
    const quantity = validator.integer("quantity", { min: 1, max: 50 })
    validator.done()
    return { releaseId: releaseId as string, quantity: quantity as number }
  })
}

ordersRouter.post("/", writeRateLimit, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const validator = new Validator(body)

  const customerName = validator.string("customerName", { max: 120 })
  const customerEmail = validator.email("customerEmail")
  const phone = validator.string("phone", { max: 30 })
  const shippingMethod = validator.oneOf("shippingMethod", SHIPPING_METHODS)

  const needsAddress = shippingMethod === "despacho"
  const address = validator.string("address", { required: needsAddress, max: 200 })
  const city = validator.string("city", { required: needsAddress, max: 80 })
  const region = validator.string("region", { required: needsAddress, max: 80 })
  validator.done()

  const order = await createOrder({
    customerName: customerName as string,
    customerEmail: customerEmail as string,
    phone: phone as string,
    shippingMethod: shippingMethod as OrderDraft["shippingMethod"],
    address: address ?? null,
    city: city ?? null,
    region: region ?? null,
    items: parseItems(body.items),
  })

  res.status(201).json(order)
})

/**
 * Arranca el cobro: crea la preferencia de Checkout Pro y devuelve a dónde
 * mandar al cliente. Se puede repetir sobre un pedido pendiente, por si el
 * primer intento se abandonó.
 */
ordersRouter.post("/:id/pago", writeRateLimit, async (req: Request, res: Response) => {
  if (!isPaymentsConfigured()) {
    res.status(503).json({ error: "Los pagos en línea no están configurados" })
    return
  }

  const id = param(req, "id")
  const order = await getOrder(id)
  if (!order) {
    res.status(404).json({ error: "Pedido no encontrado" })
    return
  }
  if (order.status !== "pendiente") {
    res.status(409).json({ error: "Este pedido ya no admite pago" })
    return
  }

  const preference = await createPreference({
    orderId: order.id,
    items: [
      ...order.items.map((item) => ({
        id: item.releaseId,
        title: `${item.artist} — ${item.title}`,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
      // El despacho va como una línea más: si no, se cobraría de menos.
      ...(order.shippingCost > 0
        ? [{ id: "despacho", title: "Despacho", quantity: 1, unit_price: order.shippingCost }]
        : []),
    ],
    payer: { name: order.customerName, email: order.customerEmail },
    backUrl: `${env.appUrl}/pedido/${order.id}`,
    notificationUrl: env.paymentsNotificationUrl,
  })

  await setOrderPreference(order.id, preference.id)
  res.json({ preferenceId: preference.id, initPoint: preference.initPoint })
})

ordersRouter.get("/", requireAdmin, async (_req: Request, res: Response) => {
  res.json({ items: await listOrders() })
})

ordersRouter.get("/:id", async (req: Request, res: Response) => {
  const order = await getOrder(param(req, "id"))
  if (!order) {
    res.status(404).json({ error: "Pedido no encontrado" })
    return
  }
  res.json(order)
})

ordersRouter.patch("/:id/estado", requireAdmin, async (req: Request, res: Response) => {
  const validator = new Validator((req.body ?? {}) as Record<string, unknown>)
  const status = validator.oneOf("status", ORDER_STATUSES)
  validator.done()

  const updated = await updateOrderStatus(
    param(req, "id"),
    status as (typeof ORDER_STATUSES)[number],
  )
  if (!updated) {
    res.status(404).json({ error: "Pedido no encontrado" })
    return
  }
  res.json(updated)
})
