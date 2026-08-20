import { Link } from "react-router"
import { useWishlist } from "../../hooks/useWishlist"
import { HeartIcon } from "../icons/HeartIcon"

/** Sólo aparece con sesión: sin ella no hay lista que enseñar. */
export function WishlistLink() {
  const { enabled, ids } = useWishlist()
  if (!enabled) return null

  return (
    <Link
      to="/lista-deseos"
      viewTransition
      className="flex min-h-11 items-center gap-2 px-2 text-paper transition-colors hover:text-volt"
    >
      <HeartIcon className="size-5" filled={ids.length > 0} />
      <span className="label">{ids.length}</span>
      <span className="sr-only">Lista de deseos</span>
    </Link>
  )
}
