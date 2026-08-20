import { request } from "./client"

export type ShippingMethod = "retiro" | "despacho"

export interface OrderDraft {
  customerName: string
  customerEmail: string
  phone: string
  shippingMethod: ShippingMethod
  address?: string
  city?: string
  region?: string
  items: { releaseId: string; quantity: number }[]
}

export interface OrderItem {
  releaseId: string
  artist: string
  title: string
  unitPrice: number
  quantity: number
}

export type PaymentStatus =
  | "sin_iniciar"
  | "pendiente"
  | "aprobado"
  | "rechazado"
  | "anulado"
  | "reembolsado"

export interface Order {
  id: string
  customerName: string
  customerEmail: string
  phone: string
  shippingMethod: ShippingMethod
  /** Sólo con despacho; en retiro llegan vacíos. */
  address: string | null
  city: string | null
  region: string | null
  subtotal: number
  shippingCost: number
  total: number
  status: string
  paymentStatus: PaymentStatus
  paymentId: string | null
  paidAt: string | null
  createdAt: string
  items: OrderItem[]
}

export function createOrder(draft: OrderDraft): Promise<Order> {
  return request<Order>("/api/orders", { method: "POST", body: draft })
}

/**
 * Arranca el cobro y devuelve a dónde mandar al cliente: Checkout Pro cobra en
 * el sitio de Mercado Pago, no aquí.
 */
export function startPayment(orderId: string): Promise<{ initPoint: string }> {
  return request<{ initPoint: string }>(`/api/orders/${encodeURIComponent(orderId)}/pago`, {
    method: "POST",
  })
}

export function fetchOrder(id: string, signal?: AbortSignal): Promise<Order> {
  return request<Order>(`/api/orders/${encodeURIComponent(id)}`, { signal })
}

/** Solo para administración: el API exige rol admin. */
export const ORDER_STATUSES = ["pendiente", "pagado", "enviado", "anulado"] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Cambia el estado del pedido. Sólo administración. */
export function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  return request<Order>(`/api/orders/${encodeURIComponent(id)}/estado`, {
    method: "PATCH",
    body: { status },
    auth: true,
  })
}

export function fetchOrders(signal?: AbortSignal): Promise<{ items: Order[] }> {
  return request<{ items: Order[] }>("/api/orders", { signal, auth: true })
}
