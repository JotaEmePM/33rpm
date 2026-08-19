export type ReleaseFormat = "LP" | "2LP" | "EP" | '7"' | "Box"

export type ReleaseCondition = "Nuevo" | "Usado"

export type OrderStatus = "pendiente" | "pagado" | "enviado" | "anulado"

export type ShippingMethod = "retiro" | "despacho"

export interface Track {
  position: string
  title: string
  duration: string
}

export interface Release {
  id: string
  artist: string
  title: string
  year: number
  genre: string
  label: string
  format: ReleaseFormat
  condition: ReleaseCondition
  price: number
  stock: number
  isNew: boolean
  tracklist: Track[]
}

export interface ReleaseQuery {
  search?: string
  genre?: string
  formats?: string[]
  conditions?: string[]
  onlyInStock?: boolean
  onlyNew?: boolean
  sort?: "recientes" | "precio-asc" | "precio-desc" | "artista"
  page: number
  pageSize: number
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
  phone: string
  shippingMethod: ShippingMethod
  address: string | null
  city: string | null
  region: string | null
  subtotal: number
  shippingCost: number
  total: number
  status: OrderStatus
  createdAt: string
  items: OrderItem[]
}
