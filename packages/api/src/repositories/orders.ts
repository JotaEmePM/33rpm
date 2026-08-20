import { randomUUID } from "node:crypto"
import { all, type Executor, int, one, run, transaction } from "../db/connection.js"
import type { Order, OrderItem, OrderStatus, PaymentStatus, ShippingMethod } from "../types.js"
import { decrementStock, getRelease } from "./releases.js"

/** Tarifa plana de muestra: reemplazar por la política real de despacho. */
export const SHIPPING_FLAT_CLP = 4990

export interface OrderDraft {
  customerName: string
  customerEmail: string
  phone: string
  shippingMethod: ShippingMethod
  address?: string | null
  city?: string | null
  region?: string | null
  items: { releaseId: string; quantity: number }[]
}

export class OrderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = "OrderError"
  }
}

interface OrderRow {
  id: string
  customer_name: string
  customer_email: string
  phone: string
  shipping_method: string
  address: string | null
  city: string | null
  region: string | null
  subtotal: number
  shipping_cost: number
  total: number
  status: string
  payment_status: string | null
  payment_id: string | null
  preference_id: string | null
  paid_at: string | null
  created_at: string
}

interface OrderItemRow {
  order_id: string
  release_id: string
  artist: string
  title: string
  unit_price: number
  quantity: number
}

function toOrder(row: OrderRow, items: OrderItem[]): Order {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    phone: row.phone,
    shippingMethod: row.shipping_method as ShippingMethod,
    address: row.address,
    city: row.city,
    region: row.region,
    subtotal: int(row.subtotal),
    shippingCost: int(row.shipping_cost),
    total: int(row.total),
    status: row.status as OrderStatus,
    paymentStatus: (row.payment_status as PaymentStatus | null) ?? "sin_iniciar",
    paymentId: row.payment_id,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    items,
  }
}

async function itemsFor(orderId: string, on?: Executor): Promise<OrderItem[]> {
  const rows = await all<OrderItemRow>(
    "SELECT * FROM order_items WHERE order_id = ? ORDER BY id",
    [orderId],
    on,
  )

  return rows.map((row) => ({
    releaseId: row.release_id,
    artist: row.artist,
    title: row.title,
    unitPrice: int(row.unit_price),
    quantity: int(row.quantity),
  }))
}

export async function createOrder(draft: OrderDraft, on?: Executor): Promise<Order> {
  if (!on) return transaction((tx) => createOrder(draft, tx))

  const items: OrderItem[] = []

  for (const line of draft.items) {
    const release = await getRelease(line.releaseId, on)
    if (!release) {
      throw new OrderError(`El disco ${line.releaseId} no existe`, 404)
    }
    if (!release.visible) {
      throw new OrderError(`"${release.title}" ya no está disponible`, 409, {
        releaseId: release.id,
      })
    }
    if (!(await decrementStock(release.id, line.quantity, on))) {
      throw new OrderError(`Stock insuficiente de "${release.title}"`, 409, {
        releaseId: release.id,
        available: release.stock,
        requested: line.quantity,
      })
    }
    items.push({
      releaseId: release.id,
      artist: release.artist,
      title: release.title,
      unitPrice: release.price,
      quantity: line.quantity,
    })
  }

  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0)
  const shippingCost = draft.shippingMethod === "retiro" ? 0 : SHIPPING_FLAT_CLP
  const id = randomUUID()

  await run(
    `INSERT INTO orders (id, customer_name, customer_email, phone, shipping_method,
                         address, city, region, subtotal, shipping_cost, total, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
    [
      id,
      draft.customerName,
      draft.customerEmail,
      draft.phone,
      draft.shippingMethod,
      draft.address ?? null,
      draft.city ?? null,
      draft.region ?? null,
      subtotal,
      shippingCost,
      subtotal + shippingCost,
    ],
    on,
  )

  for (const item of items) {
    await run(
      `INSERT INTO order_items (order_id, release_id, artist, title, unit_price, quantity)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, item.releaseId, item.artist, item.title, item.unitPrice, item.quantity],
      on,
    )
  }

  const created = await getOrder(id, on)
  if (!created) throw new OrderError("No se pudo leer el pedido recién creado", 500)
  return created
}

export async function getOrder(id: string, on?: Executor): Promise<Order | null> {
  const row = await one<OrderRow>("SELECT * FROM orders WHERE id = ?", [id], on)
  if (!row) return null
  return toOrder(row, await itemsFor(id, on))
}

export async function listOrders(limit = 50, on?: Executor): Promise<Order[]> {
  const rows = await all<OrderRow>(
    "SELECT * FROM orders ORDER BY created_at DESC, id LIMIT ?",
    [limit],
    on,
  )
  const orders: Order[] = []
  for (const row of rows) {
    orders.push(toOrder(row, await itemsFor(row.id, on)))
  }
  return orders
}

/** Deja anotada la preferencia con la que el cliente se fue a pagar. */
export async function setOrderPreference(
  id: string,
  preferenceId: string,
  on?: Executor,
): Promise<void> {
  await run(
    "UPDATE orders SET preference_id = ?, payment_status = COALESCE(payment_status, 'pendiente') WHERE id = ?",
    [preferenceId, id],
    on,
  )
}

/** Devuelve al catálogo las unidades de un pedido que no llegó a cobrarse. */
async function restoreStock(id: string, on: Executor): Promise<void> {
  const items = await all<{ release_id: string; quantity: number }>(
    "SELECT release_id, quantity FROM order_items WHERE order_id = ?",
    [id],
    on,
  )
  for (const item of items) {
    await run(
      "UPDATE releases SET stock = stock + ? WHERE id = ?",
      [int(item.quantity), item.release_id],
      on,
    )
  }
}

/**
 * Aplica lo que diga Mercado Pago sobre un pago.
 *
 * Es idempotente porque las notificaciones se repiten: si el pedido ya está en
 * ese estado no se vuelve a tocar, y el stock sólo se repone la primera vez que
 * el pago se da por perdido.
 */
export async function applyPaymentResult(
  id: string,
  result: { paymentStatus: PaymentStatus; paymentId: string },
  on?: Executor,
): Promise<Order | null> {
  if (!on) return transaction((tx) => applyPaymentResult(id, result, tx))

  const current = await getOrder(id, on)
  if (!current) return null
  if (current.paymentStatus === result.paymentStatus) return current

  const { paymentStatus, paymentId } = result
  // Un pago que nunca prosperó libera las unidades; un reembolso no, porque el
  // disco pudo haber salido ya y esa decisión es de la tienda.
  const lost = paymentStatus === "rechazado" || paymentStatus === "anulado"

  // "enviado" no retrocede: si el disco ya salió, el cobro se resuelve fuera del sistema.
  let status: OrderStatus = current.status
  if (paymentStatus === "aprobado" && current.status === "pendiente") status = "pagado"
  if (lost && current.status === "pendiente") status = "anulado"
  if (paymentStatus === "reembolsado" && current.status !== "enviado") status = "anulado"

  await run(
    `UPDATE orders
     SET status = ?, payment_status = ?, payment_id = ?, paid_at = ?
     WHERE id = ?`,
    [
      status,
      paymentStatus,
      paymentId,
      paymentStatus === "aprobado" ? (current.paidAt ?? new Date().toISOString()) : current.paidAt,
      id,
    ],
    on,
  )

  // Sólo cuando el pedido estaba vivo: un anulado ya devolvió lo suyo.
  if (lost && current.status === "pendiente") await restoreStock(id, on)

  return getOrder(id, on)
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  on?: Executor,
): Promise<Order | null> {
  const changes = await run("UPDATE orders SET status = ? WHERE id = ?", [status, id], on)
  if (changes === 0) return null
  return getOrder(id, on)
}
