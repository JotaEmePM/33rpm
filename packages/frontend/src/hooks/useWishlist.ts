import { useContext } from "react"
import { WishlistContext, type WishlistContextValue } from "../context/wishlist-context"

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error("useWishlist debe usarse dentro de <WishlistProvider>")
  }
  return context
}
