export type ReleaseFormat = "LP" | "2LP" | "EP" | '7"' | "Box"

export type ReleaseCondition = "Nuevo" | "Usado"

export type OrderStatus = "pendiente" | "pagado" | "enviado" | "anulado"

/** Estado del cobro tal como lo reporta Mercado Pago, más el previo al intento. */
export type PaymentStatus =
  | "sin_iniciar"
  | "pendiente"
  | "aprobado"
  | "rechazado"
  | "anulado"
  | "reembolsado"

export type ShippingMethod = "retiro" | "despacho"

export interface Track {
  position: string
  title: string
  duration: string
}

export interface ReleaseImage {
  id: string
  url: string
  /** Ruta dentro del store de Blob: es lo que hace falta para borrarla. */
  pathname: string
  /** La que representa al disco en el catálogo y en la búsqueda. */
  isPrimary: boolean
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
  /** Anunciado antes de llegar a la tienda. */
  isPreorder: boolean
  /** Elegido para la portada. */
  isFeatured: boolean
  /** Un disco no visible sigue en el catálogo pero no se muestra ni se vende. */
  visible: boolean
  /** Ficha del álbum en Last.fm, de donde se copian pistas y datos. */
  lastfmUrl: string | null
  /**
   * En la ficha llegan todas, con la principal primero; en los listados sólo
   * viaja la principal, que es lo único que se dibuja.
   */
  images: ReleaseImage[]
  tracklist: Track[]
}

export interface ReleaseQuery {
  search?: string
  genre?: string
  formats?: string[]
  conditions?: string[]
  onlyInStock?: boolean
  onlyNew?: boolean
  onlyPreorder?: boolean
  onlyFeatured?: boolean
  /** Para el panel: los discos a los que todavía les falta la foto. */
  onlyWithoutImages?: boolean
  /** Sólo la administración pide ver los discos ocultos. */
  includeHidden?: boolean
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
  /** Cómo va el cobro; el pedido puede existir sin haberse intentado pagar. */
  paymentStatus: PaymentStatus
  paymentId: string | null
  paidAt: string | null
  createdAt: string
  items: OrderItem[]
}
