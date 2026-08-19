import { Link } from "react-router"
import { useCart } from "../../hooks/useCart"
import { CartIcon } from "../icons/CartIcon"

export function CartButton() {
  const { itemCount } = useCart()

  return (
    <Link
      to="/carrito"
      className="flex min-h-11 items-center gap-2 border-2 border-paper px-4 transition-colors hover:bg-paper hover:text-ink"
      aria-label={`Carrito, ${itemCount} ${itemCount === 1 ? "disco" : "discos"}`}
    >
      <CartIcon />
      <span className="font-display text-lg tabular-nums">{itemCount}</span>
    </Link>
  )
}
