import { useRef } from "react"
import { Link, useLoaderData } from "react-router"
import { ReleaseCard } from "../components/catalog/ReleaseCard"
import { WishlistButton } from "../components/catalog/WishlistButton"
import { AddToCartPanel } from "../components/product/AddToCartPanel"
import { ReleaseGallery } from "../components/product/ReleaseGallery"
import { ReleaseMeta } from "../components/product/ReleaseMeta"
import { Tracklist } from "../components/product/Tracklist"
import { Badge } from "../components/ui/Badge"
import { useReleases } from "../hooks/useReleases"
import type { Release } from "../types"

export function ProductPage() {
  // El loader ya resolvió el disco: sin estado de carga, la carátula existe cuando
  // el navegador toma el snapshot y puede morfear desde la card del catálogo.
  const release = useLoaderData() as Release
  const sleeveRef = useRef<HTMLDivElement>(null)
  const related = useReleases({ genre: release.genre, pageSize: 5 })

  const relatedItems = (related.data?.items ?? [])
    .filter((item) => item.id !== release.id)
    .slice(0, 4)

  return (
    <>
      <nav className="label border-b border-ash px-4 py-3 text-muted sm:px-6" aria-label="Miga">
        <Link to="/catalogo" viewTransition className="hover:text-volt">
          Catálogo
        </Link>
        <span className="px-2">/</span>
        <Link
          to={`/catalogo?genero=${encodeURIComponent(release.genre)}`}
          viewTransition
          className="hover:text-volt"
        >
          {release.genre}
        </Link>
      </nav>

      <div className="grid gap-8 border-b-2 border-paper px-4 py-8 sm:px-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ReleaseGallery release={release} sleeveRef={sleeveRef} />
          <ReleaseMeta release={release} />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            {release.isPreorder || release.isFeatured ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {release.isPreorder ? <Badge tone="paper">Preventa</Badge> : null}
                {release.isFeatured ? <Badge tone="ink">Destacado</Badge> : null}
              </div>
            ) : null}
            <p className="label text-volt">{release.artist}</p>
            <h1 className="mt-2 font-display text-5xl uppercase leading-[0.9] sm:text-6xl">
              {release.title}
            </h1>
          </div>

          <div className="flex flex-col gap-3">
            <AddToCartPanel release={release} sleeveRef={sleeveRef} />
            <WishlistButton
              release={release}
              withLabel
              className="self-start border-2 border-ash"
            />
          </div>
          <Tracklist tracks={release.tracklist} />
        </div>
      </div>

      {relatedItems.length > 0 ? (
        <section className="px-4 py-10 sm:px-6">
          <h2 className="border-b-2 border-paper pb-3 font-display text-3xl uppercase">
            Del mismo estante
          </h2>
          <div className="mt-6 grid grid-cols-1 border-l border-t border-ash sm:grid-cols-2 lg:grid-cols-4">
            {relatedItems.map((item) => (
              <ReleaseCard key={item.id} release={item} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}
