import { Link } from "react-router"
import { useCart } from "../../hooks/useCart"
import { formatPrice } from "../../lib/format"
import type { CartLine } from "../../types"
import { TrashIcon } from "../icons/TrashIcon"
import { QuantityStepper } from "../ui/QuantityStepper"
import { Sleeve } from "../ui/Sleeve"

export function CartLineItem({ line }: { line: CartLine }) {
  const { setQuantity, remove } = useCart()
  const { release, quantity } = line

  return (
    <article className="flex flex-wrap items-center gap-4 border-t border-ash py-4">
      <Sleeve artist={release.artist} title={release.title} className="w-20 shrink-0" />

      <div className="min-w-40 flex-1">
        <Link
          to={`/disco/${release.id}`}
          className="font-display text-xl uppercase hover:text-volt"
        >
          {release.title}
        </Link>
        <p className="text-sm text-muted">{release.artist}</p>
        <p className="label mt-1 text-muted">
          {release.format} · {release.condition}
        </p>
      </div>

      <QuantityStepper
        value={quantity}
        max={release.stock}
        onChange={(next) => setQuantity(release.id, next)}
      />

      <span className="w-28 text-right font-display text-xl tabular-nums">
        {formatPrice(release.price * quantity)}
      </span>

      <button
        type="button"
        onClick={() => remove(release.id)}
        aria-label={`Quitar ${release.title} del carrito`}
        className="flex size-11 items-center justify-center text-muted transition-colors hover:text-volt"
      >
        <TrashIcon />
      </button>
    </article>
  )
}
