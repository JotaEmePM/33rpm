import { randomUUID } from "node:crypto"
import { db, transaction } from "../db/connection.js"
import type { Order, OrderItem, OrderStatus, ShippingMethod } from "../types.js"
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
    subtotal: row.subtotal,
    shippingCost: row.shipping_cost,
    total: row.total,
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    items,
  }
}

function itemsFor(orderId: string): OrderItem[] {
  const rows = db
    .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id")
    .all(orderId) as unknown as OrderItemRow[]

  return rows.map((row) => ({
    releaseId: row.release_id,
    artist: row.artist,
    title: row.title,
    unitPrice: row.unit_price,
    quantity: row.quantity,
  }))
}

export function createOrder(draft: OrderDraft): Order {
  return transaction(() => {
    const items: OrderItem[] = []

    for (const line of draft.items) {
      const release = getRelease(line.releaseId)
      if (!release) {
        throw new OrderError(`El disco ${line.releaseId} no existe`, 404)
      }
      if (!decrementStock(release.id, line.quantity)) {
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

    db.prepare(
      `INSERT INTO orders (id, customer_name, customer_email, phone, shipping_method,
                           address, city, region, subtotal, shipping_cost, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
    ).run(
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
    )

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, release_id, artist, title, unit_price, quantity)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    for (const item of items) {
      insertItem.run(id, item.releaseId, item.artist, item.title, item.unitPrice, item.quantity)
    }

    const created = getOrder(id)
    if (!created) throw new OrderError("No se pudo leer el pedido recién creado", 500)
    return created
  })
}

export function getOrder(id: string): Order | null {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as unknown as
    | OrderRow
    | undefined
  if (!row) return null
  return toOrder(row, itemsFor(id))
}

export function listOrders(limit = 50): Order[] {
  const rows = db
    .prepare("SELECT * FROM orders ORDER BY created_at DESC, id LIMIT ?")
    .all(limit) as unknown as OrderRow[]
  return rows.map((row) => toOrder(row, itemsFor(row.id)))
}

export function updateOrderStatus(id: string, status: OrderStatus): Order | null {
  const result = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id)
  if (result.changes === 0) return null
  return getOrder(id)
}
