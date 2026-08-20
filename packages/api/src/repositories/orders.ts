import { randomUUID } from "node:crypto"
import { all, type Executor, int, one, run, transaction } from "../db/connection.js"
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
    subtotal: int(row.subtotal),
    shippingCost: int(row.shipping_cost),
    total: int(row.total),
    status: row.status as OrderStatus,
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

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  on?: Executor,
): Promise<Order | null> {
  const changes = await run("UPDATE orders SET status = ? WHERE id = ?", [status, id], on)
  if (changes === 0) return null
  return getOrder(id, on)
}
