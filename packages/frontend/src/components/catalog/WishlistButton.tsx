import { useLocation, useNavigate } from "react-router"
import { useWishlist } from "../../hooks/useWishlist"
import type { Release } from "../../types"
import { HeartIcon } from "../icons/HeartIcon"

interface WishlistButtonProps {
  release: Release
  /** En la ficha el botón lleva texto; en el catálogo es sólo el corazón. */
  withLabel?: boolean
  className?: string
}

/**
 * Marca o desmarca un disco en la lista de deseos. Sin sesión no se guarda
 * nada: lleva a entrar y vuelve a donde estaba.
 */
export function WishlistButton({
  release,
  withLabel = false,
  className = "",
}: WishlistButtonProps) {
  const { enabled, has, toggle } = useWishlist()
  const navigate = useNavigate()
  const location = useLocation()
  const marked = enabled && has(release.id)

  function handleClick() {
    if (!enabled) {
      navigate(`/login?destino=${encodeURIComponent(location.pathname + location.search)}`, {
        viewTransition: true,
      })
      return
    }
    void toggle(release.id)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={marked}
      title={marked ? "Quitar de la lista de deseos" : "Guardar en la lista de deseos"}
      className={`flex min-h-11 items-center gap-2 px-3 transition-colors ${
        marked ? "text-volt" : "text-muted hover:text-paper"
      } ${className}`}
    >
      <HeartIcon className="size-5" filled={marked} />
      {withLabel ? (
        <span className="label">{marked ? "En tu lista" : "Guardar"}</span>
      ) : (
        <span className="sr-only">
          {marked ? "Quitar" : "Guardar"} {release.title}
        </span>
      )}
    </button>
  )
}
