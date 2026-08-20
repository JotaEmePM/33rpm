import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { addToWishlist, fetchWishlistIds, removeFromWishlist } from "../api/wishlist"
import { useSession } from "../lib/auth-client"
import { WishlistContext, type WishlistContextValue } from "./wishlist-context"

/**
 * La lista de deseos vive en el servidor, atada al cliente que entró: se carga
 * al abrir sesión y se vacía al salir.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()
  const enabled = Boolean(session)
  const [ids, setIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setIds([])
      return
    }

    const controller = new AbortController()
    setLoading(true)
    fetchWishlistIds(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setIds(result.ids)
      })
      .catch(() => {
        // Una lista que no carga no debe romper la tienda: se queda vacía.
        if (!controller.signal.aborted) setIds([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [enabled])

  const toggle = useCallback(
    async (releaseId: string) => {
      const marked = ids.includes(releaseId)
      // Se pinta el cambio de inmediato y se corrige con lo que diga el servidor.
      setIds((current) =>
        marked ? current.filter((id) => id !== releaseId) : [...current, releaseId],
      )
      try {
        const result = marked ? await removeFromWishlist(releaseId) : await addToWishlist(releaseId)
        setIds(result.ids)
      } catch {
        setIds((current) =>
          marked ? [...current, releaseId] : current.filter((id) => id !== releaseId),
        )
      }
    },
    [ids],
  )

  const value = useMemo<WishlistContextValue>(
    () => ({
      ids,
      enabled,
      loading: loading || isPending,
      has: (releaseId: string) => ids.includes(releaseId),
      toggle,
    }),
    [ids, enabled, loading, isPending, toggle],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}
