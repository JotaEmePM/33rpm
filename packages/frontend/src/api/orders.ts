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

export interface Order {
  id: string
  customerName: string
  customerEmail: string
  shippingMethod: ShippingMethod
  subtotal: number
  shippingCost: number
  total: number
  status: string
  createdAt: string
  items: OrderItem[]
}

export function createOrder(draft: OrderDraft): Promise<Order> {
  return request<Order>("/api/orders", { method: "POST", body: draft })
}

export function fetchOrder(id: string, signal?: AbortSignal): Promise<Order> {
  return request<Order>(`/api/orders/${encodeURIComponent(id)}`, { signal })
}

export function fetchOrders(signal?: AbortSignal): Promise<{ items: Order[] }> {
  return request<{ items: Order[] }>("/api/orders", { signal })
}
