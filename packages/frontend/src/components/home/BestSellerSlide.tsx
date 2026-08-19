import { Link } from "react-router"
import type { Release } from "../../types"
import { Price } from "../ui/Price"
import { Sleeve } from "../ui/Sleeve"

export function BestSellerSlide({ release, position }: { release: Release; position: number }) {
  return (
    <Link
      to={`/disco/${release.id}`}
      className="group flex snap-start flex-col gap-3 border-2 border-ash p-4 transition-colors hover:border-volt"
    >
      <div className="flex items-start gap-3">
        <span className="font-display text-3xl text-volt tabular-nums leading-none">
          {String(position).padStart(2, "0")}
        </span>
        <Sleeve artist={release.artist} title={release.title} className="w-24 shrink-0" />
      </div>

      <div className="min-w-0">
        <h3 className="truncate font-display text-xl uppercase group-hover:text-volt">
          {release.title}
        </h3>
        <p className="truncate text-sm text-muted">{release.artist}</p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <Price value={release.price} size="sm" />
        <span className="label text-muted">{release.format}</span>
      </div>
    </Link>
  )
}
