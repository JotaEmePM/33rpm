import { Link, useParams } from "react-router"
import { ReleaseCard } from "../components/catalog/ReleaseCard"
import { AddToCartPanel } from "../components/product/AddToCartPanel"
import { ReleaseMeta } from "../components/product/ReleaseMeta"
import { Tracklist } from "../components/product/Tracklist"
import { Sleeve } from "../components/ui/Sleeve"
import { ErrorState, LoadingState } from "../components/ui/StateMessage"
import { useRelease, useReleases } from "../hooks/useReleases"
import { NotFoundPage } from "./NotFoundPage"

export function ProductPage() {
  const { id } = useParams()
  const { data: release, loading, error } = useRelease(id)
  const related = useReleases({ genre: release?.genre ?? null, pageSize: 5 })

  if (loading) {
    return (
      <div className="px-4 py-10 sm:px-6">
        <LoadingState label="Cargando disco" />
      </div>
    )
  }

  if (!release) {
    // Un 404 del backend es un disco inexistente; cualquier otro error se muestra como tal.
    if (error?.includes("no encontrado")) return <NotFoundPage />
    return (
      <div className="px-4 py-10 sm:px-6">
        <ErrorState message={error ?? "No pudimos cargar este disco"} />
      </div>
    )
  }

  const relatedItems = (related.data?.items ?? [])
    .filter((item) => item.id !== release.id)
    .slice(0, 4)

  return (
    <>
      <nav className="label border-b border-ash px-4 py-3 text-muted sm:px-6" aria-label="Miga">
        <Link to="/catalogo" className="hover:text-volt">
          Catálogo
        </Link>
        <span className="px-2">/</span>
        <Link
          to={`/catalogo?genero=${encodeURIComponent(release.genre)}`}
          className="hover:text-volt"
        >
          {release.genre}
        </Link>
      </nav>

      <div className="grid gap-8 border-b-2 border-paper px-4 py-8 sm:px-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Sleeve artist={release.artist} title={release.title} />
          <ReleaseMeta release={release} />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="label text-volt">{release.artist}</p>
            <h1 className="mt-2 font-display text-5xl uppercase leading-[0.9] sm:text-6xl">
              {release.title}
            </h1>
          </div>

          <AddToCartPanel release={release} />
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
