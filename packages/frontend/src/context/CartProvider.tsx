import { type ReactNode, useCallback, useMemo, useState } from "react"
import type { CartLine, Release } from "../types"
import { CartContext, type CartContextValue } from "./cart-context"

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])

  const add = useCallback((release: Release, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((line) => line.release.id === release.id)
      if (!existing) {
        return [...current, { release, quantity: Math.min(quantity, release.stock) }]
      }
      return current.map((line) =>
        line.release.id === release.id
          ? { ...line, quantity: Math.min(line.quantity + quantity, release.stock) }
          : line,
      )
    })
  }, [])

  const setQuantity = useCallback((releaseId: string, quantity: number) => {
    setLines((current) =>
      current.flatMap((line) => {
        if (line.release.id !== releaseId) return [line]
        if (quantity < 1) return []
        return [{ ...line, quantity: Math.min(quantity, line.release.stock) }]
      }),
    )
  }, [])

  const remove = useCallback((releaseId: string) => {
    setLines((current) => current.filter((line) => line.release.id !== releaseId))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo<CartContextValue>(() => {
    return {
      lines,
      itemCount: lines.reduce((total, line) => total + line.quantity, 0),
      subtotal: lines.reduce((total, line) => total + line.quantity * line.release.price, 0),
      add,
      setQuantity,
      remove,
      clear,
    }
  }, [lines, add, setQuantity, remove, clear])

  return <CartContext value={value}>{children}</CartContext>
}
