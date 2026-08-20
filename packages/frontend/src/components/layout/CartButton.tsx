import { useEffect, useRef } from "react"
import { Link } from "react-router"
import { useCart } from "../../hooks/useCart"
import { useFlyToCart } from "../../hooks/useFlyToCart"
import { prefersReducedMotion, pulse } from "../../lib/fly-to-cart"
import { CartIcon } from "../icons/CartIcon"

export function CartButton() {
  const { itemCount } = useCart()
  const { registerTarget } = useFlyToCart()
  const iconRef = useRef<HTMLSpanElement>(null)
  const previousCount = useRef(itemCount)

  useEffect(() => {
    registerTarget(iconRef.current)
    return () => registerTarget(null)
  }, [registerTarget])

  useEffect(() => {
    const grew = itemCount > previousCount.current
    previousCount.current = itemCount
    if (grew && iconRef.current && !prefersReducedMotion()) {
      pulse(iconRef.current)
    }
  }, [itemCount])

  return (
    <Link
      to="/carrito"
      viewTransition
      className="flex min-h-11 items-center gap-2 border-2 border-paper px-4 transition-colors hover:bg-paper hover:text-ink"
      aria-label={`Carrito, ${itemCount} ${itemCount === 1 ? "disco" : "discos"}`}
    >
      <span ref={iconRef} className="flex items-center gap-2">
        <CartIcon />
        <span className="font-display text-lg tabular-nums">{itemCount}</span>
      </span>
    </Link>
  )
}
