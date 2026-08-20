import { createContext } from "react"

export interface FlyToCartValue {
  /** El botón del carrito se registra como destino del vuelo. */
  registerTarget: (element: HTMLElement | null) => void
  /** Resuelve al aterrizar; sin destino o con movimiento reducido, resuelve de inmediato. */
  flyToCart: (source: HTMLElement | null) => Promise<void>
}

export const FlyToCartContext = createContext<FlyToCartValue | null>(null)
