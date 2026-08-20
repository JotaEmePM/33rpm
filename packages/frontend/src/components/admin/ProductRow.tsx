import { Link } from "react-router"
import { formatPrice } from "../../lib/format"
import type { Release } from "../../types"
import { Badge } from "../ui/Badge"

interface ProductRowProps {
  release: Release
  onDelete: (id: string) => void
  onToggleVisible: (release: Release) => void
}

export function ProductRow({ release, onDelete, onToggleVisible }: ProductRowProps) {
  return (
    <tr className={`border-t border-ash ${release.visible ? "" : "opacity-60"}`}>
      <td className="p-3">
        <Link
          to={`/disco/${release.id}`}
          viewTransition
          className="font-display text-lg uppercase hover:text-volt"
        >
          {release.title}
        </Link>
        <p className="text-sm text-muted">{release.artist}</p>
        {release.visible && !release.isPreorder && !release.isFeatured ? null : (
          <p className="mt-1 flex flex-wrap gap-1">
            {release.visible ? null : <Badge>Oculto</Badge>}
            {release.isPreorder ? <Badge tone="paper">Preventa</Badge> : null}
            {release.isFeatured ? <Badge tone="ink">Destacado</Badge> : null}
          </p>
        )}
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
          onClick={() => onToggleVisible(release)}
          className="label min-h-11 px-2 text-muted transition-colors hover:text-volt"
        >
          {release.visible ? "Ocultar" : "Mostrar"}
        </button>
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
