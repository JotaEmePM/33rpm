import { useEffect, useState } from "react"
import { Link } from "react-router"
import { fetchWishlist } from "../api/wishlist"
import { ReleaseGrid } from "../components/catalog/ReleaseGrid"
import { LinkButton } from "../components/ui/LinkButton"
import { ErrorState, LoadingState } from "../components/ui/StateMessage"
import { useWishlist } from "../hooks/useWishlist"
import type { Release } from "../types"

export function WishlistPage() {
  const { enabled, ids } = useWishlist()
  const [releases, setReleases] = useState<Release[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Se carga una vez por sesión; quitar un disco desde aquí lo saca de la vista
  // filtrando por los ids del contexto, sin volver a preguntar al servidor.
  useEffect(() => {
    if (!enabled) {
      setReleases(null)
      return
    }

    const controller = new AbortController()
    fetchWishlist(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setReleases(result.items)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("No pudimos cargar tu lista")
      })

    return () => controller.abort()
  }, [enabled])

  const marked = (releases ?? []).filter((release) => ids.includes(release.id))

  return (
    <>
      <section className="border-b-2 border-paper px-4 py-8 sm:px-6">
        <p className="label text-volt">Tu cuenta</p>
        <h1 className="mt-3 font-display text-5xl uppercase leading-[0.9] sm:text-6xl">
          Lista de deseos
        </h1>
        <p className="mt-2 text-muted">
          {enabled
            ? `${ids.length} ${ids.length === 1 ? "disco guardado" : "discos guardados"}`
            : "Entra para guardar discos y encontrarlos después"}
        </p>
      </section>

      <div className="px-4 py-8 sm:px-6">
        {!enabled ? (
          <div className="flex flex-col items-start gap-4 border-2 border-ash p-6">
            <p className="text-sm text-muted">
              La lista queda guardada en tu cuenta, así que la ves desde cualquier dispositivo.
            </p>
            <LinkButton to="/login?destino=/lista-deseos">Entrar</LinkButton>
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : releases === null ? (
          <LoadingState label="Cargando tu lista" />
        ) : marked.length === 0 ? (
          <div className="flex flex-col items-start gap-4 border-2 border-ash p-6">
            <p className="text-sm text-muted">
              Todavía no has guardado nada. Marca el corazón de cualquier disco del catálogo.
            </p>
            <Link to="/catalogo" viewTransition className="label text-volt hover:text-paper">
              Ir al catálogo
            </Link>
          </div>
        ) : (
          <ReleaseGrid releases={marked} />
        )}
      </div>
    </>
  )
}
