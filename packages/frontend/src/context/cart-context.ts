import { createContext } from "react"
import type { CartLine, Release } from "../types"

export interface CartContextValue {
  lines: CartLine[]
  itemCount: number
  subtotal: number
  add: (release: Release, quantity?: number) => void
  setQuantity: (releaseId: string, quantity: number) => void
  remove: (releaseId: string) => void
  clear: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)
