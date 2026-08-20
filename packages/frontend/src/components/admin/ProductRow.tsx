import { Link } from "react-router"
import { formatPrice } from "../../lib/format"
import type { Release } from "../../types"

interface ProductRowProps {
  release: Release
  onDelete: (id: string) => void
}

export function ProductRow({ release, onDelete }: ProductRowProps) {
  return (
    <tr className="border-t border-ash">
      <td className="p-3">
        <Link
          to={`/disco/${release.id}`}
          viewTransition
          className="font-display text-lg uppercase hover:text-volt"
        >
          {release.title}
        </Link>
        <p className="text-sm text-muted">{release.artist}</p>
      </td>
      <td className="p-3 text-sm text-muted">{release.label}</td>
      <td className="p-3 text-sm">{release.format}</td>
      <td className="p-3 text-sm">{release.condition}</td>
      <td className="p-3 text-right tabular-nums">{formatPrice(release.price)}</td>
      <td className="p-3 text-right">
        <span className={release.stock === 0 ? "text-volt" : "text-paper"}>
          {release.stock === 0 ? "Agotado" : release.stock}
        </span>
      </td>
      <td className="p-3 text-right">
        <button
          type="button"
          onClick={() => onDelete(release.id)}
          className="label min-h-11 px-2 text-muted transition-colors hover:text-volt"
        >
          Eliminar
        </button>
      </td>
    </tr>
  )
}
