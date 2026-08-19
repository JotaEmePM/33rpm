import { Link } from "react-router"
import { useCart } from "../../hooks/useCart"
import type { Release } from "../../types"
import { Badge } from "../ui/Badge"
import { Price } from "../ui/Price"
import { Sleeve } from "../ui/Sleeve"

export function ReleaseCard({ release }: { release: Release }) {
  const { add } = useCart()
  const soldOut = release.stock === 0

  return (
    <article className="flex flex-col gap-3 border-b border-r border-ash p-4">
      <Link to={`/disco/${release.id}`} className="group flex flex-col gap-3">
        <div className="relative">
          <Sleeve artist={release.artist} title={release.title} />
          {release.isNew ? (
            <span className="label absolute left-0 top-0 bg-volt px-2 py-1 text-ink">Nuevo</span>
          ) : null}
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
            onClick={() => add(release)}
            className="label min-h-11 bg-paper px-4 text-ink transition-colors hover:bg-volt"
          >
            Agregar
          </button>
        )}
      </div>
    </article>
  )
}
