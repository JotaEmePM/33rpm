import { type Request, type Response, Router } from "express"
import { param } from "../lib/http.js"
import { ORDER_STATUSES, SHIPPING_METHODS, ValidationError, Validator } from "../lib/validation.js"
import { requireAdmin } from "../middleware/require-auth.js"
import { writeRateLimit } from "../middleware/security.js"
import {
  createOrder,
  getOrder,
  listOrders,
  type OrderDraft,
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

ordersRouter.post("/", writeRateLimit, (req: Request, res: Response) => {
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

  const order = createOrder({
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

ordersRouter.get("/", requireAdmin, (_req: Request, res: Response) => {
  res.json({ items: listOrders() })
})

ordersRouter.get("/:id", (req: Request, res: Response) => {
  const order = getOrder(param(req, "id"))
  if (!order) {
    res.status(404).json({ error: "Pedido no encontrado" })
    return
  }
  res.json(order)
})

ordersRouter.patch("/:id/estado", requireAdmin, (req: Request, res: Response) => {
  const validator = new Validator((req.body ?? {}) as Record<string, unknown>)
  const status = validator.oneOf("status", ORDER_STATUSES)
  validator.done()

  const updated = updateOrderStatus(param(req, "id"), status as (typeof ORDER_STATUSES)[number])
  if (!updated) {
    res.status(404).json({ error: "Pedido no encontrado" })
    return
  }
  res.json(updated)
})
