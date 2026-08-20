import { createContext } from "react"

export interface WishlistContextValue {
  ids: string[]
  /** Falso mientras no haya sesión: la lista vive en el servidor. */
  enabled: boolean
  loading: boolean
  has: (releaseId: string) => boolean
  toggle: (releaseId: string) => Promise<void>
}

export const WishlistContext = createContext<WishlistContextValue | null>(null)
