import { useRef } from "react"
import { Link, useViewTransitionState } from "react-router"
import { useCart } from "../../hooks/useCart"
import { useFlyToCart } from "../../hooks/useFlyToCart"
import type { Release } from "../../types"
import { Badge } from "../ui/Badge"
import { Price } from "../ui/Price"
import { Sleeve } from "../ui/Sleeve"

interface ReleaseCardProps {
  release: Release
  /**
   * Marca la card para que el navegador la siga entre filtros del catálogo.
   * Debe estar puesto antes de que arranque la navegación, por eso no depende
   * de que haya una transición en curso.
   */
  animated?: boolean
}

export function ReleaseCard({ release, animated = false }: ReleaseCardProps) {
  const { add } = useCart()
  const { flyToCart } = useFlyToCart()
  const sleeveRef = useRef<HTMLDivElement>(null)
  const to = `/disco/${release.id}`
  // Solo la card que se está abriendo nombra su carátula: dos elementos con el
  // mismo view-transition-name cancelarían la transición.
  const isOpening = useViewTransitionState(to)
  const soldOut = release.stock === 0

  // El disco entra al carrito cuando la carátula aterriza, no al soltar el clic.
  async function handleAdd() {
    await flyToCart(sleeveRef.current)
    add(release)
  }

  return (
    <article
      className="flex flex-col gap-3 border-b border-r border-ash p-4"
      style={animated ? { viewTransitionName: `card-${release.id}` } : undefined}
    >
      <Link to={to} viewTransition className="group flex flex-col gap-3">
        <div className="relative">
          <Sleeve
            ref={sleeveRef}
            artist={release.artist}
            title={release.title}
            src={release.images[0]?.url}
            viewTransitionName={isOpening ? `sleeve-${release.id}` : undefined}
          />
          {/* Las marcas se apilan para que ninguna tape a otra sobre la carátula. */}
          <div className="absolute left-0 top-0 flex flex-col items-start gap-1">
            {release.isPreorder ? <Badge tone="paper">Preventa</Badge> : null}
            {release.isNew ? <Badge tone="volt">Nuevo</Badge> : null}
            {release.isFeatured ? <Badge tone="ink">Destacado</Badge> : null}
          </div>
          {soldOut ? (
            <span className="label absolute inset-x-0 bottom-0 bg-ink/90 py-2 text-center text-paper">
              Agotado
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-xl uppercase leading-tight group-hover:text-volt">
            {release.title}
          </h3>
          <p className="text-sm text-muted">{release.artist}</p>
        </div>
      </Link>

      <p className="label text-muted">
        {release.year} · {release.format} · {release.label}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2">
        <Price value={release.price} size="sm" />
        {soldOut ? (
          <Badge>Sin stock</Badge>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            className="label min-h-11 bg-paper px-4 text-ink transition-colors hover:bg-volt"
          >
            Agregar
          </button>
        )}
      </div>
    </article>
  )
}
