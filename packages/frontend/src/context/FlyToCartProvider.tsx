import { type ReactNode, useCallback, useMemo, useRef } from "react"
import { flyToCart as animate, prefersReducedMotion } from "../lib/fly-to-cart"
import { FlyToCartContext, type FlyToCartValue } from "./fly-to-cart-context"

export function FlyToCartProvider({ children }: { children: ReactNode }) {
  const targetRef = useRef<HTMLElement | null>(null)

  const registerTarget = useCallback((element: HTMLElement | null) => {
    targetRef.current = element
  }, [])

  const flyToCart = useCallback((source: HTMLElement | null) => {
    const target = targetRef.current
    if (!source || !target || prefersReducedMotion()) return Promise.resolve()
    return animate(source, target)
  }, [])

  const value = useMemo<FlyToCartValue>(
    () => ({ registerTarget, flyToCart }),
    [registerTarget, flyToCart],
  )

  return <FlyToCartContext value={value}>{children}</FlyToCartContext>
}
