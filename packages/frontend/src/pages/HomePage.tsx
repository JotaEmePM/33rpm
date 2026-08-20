import { useNavigate } from "react-router"
import { GenreBar } from "../components/catalog/GenreBar"
import { BestSellers } from "../components/home/BestSellers"
import { Hero } from "../components/home/Hero"
import { NewReleases } from "../components/home/NewReleases"
import { NewsletterBar } from "../components/home/NewsletterBar"
import { ErrorState, LoadingState } from "../components/ui/StateMessage"
import { useMeta } from "../hooks/useMeta"
import { useReleases } from "../hooks/useReleases"

export function HomePage() {
  const navigate = useNavigate()
  const meta = useMeta()
  const arrivals = useReleases({ onlyNew: true, pageSize: 4 })
  // El carrusel es de discos destacados; mientras no haya ninguno marcado,
  // la portada sigue enseñando lo último que llegó en vez de quedarse vacía.
  const featured = useReleases({ onlyFeatured: true, pageSize: 8 })
  const bestSellers = useReleases({ sort: "recientes", pageSize: 8 })
  const highlights = featured.data?.items ?? []

  return (
    <>
      <Hero />
      <GenreBar
        genres={meta.genres}
        selected={null}
        onSelect={(genre) =>
          navigate(genre ? `/catalogo?genero=${encodeURIComponent(genre)}` : "/catalogo", {
            viewTransition: true,
          })
        }
      />

      {arrivals.loading ? (
        <div className="px-4 py-10 sm:px-6">
          <LoadingState label="Cargando novedades" />
        </div>
      ) : null}

      {arrivals.error ? (
        <div className="px-4 py-10 sm:px-6">
          <ErrorState message={arrivals.error} />
        </div>
      ) : null}

      {arrivals.data ? (
        <NewReleases releases={arrivals.data.items} total={arrivals.data.total} />
      ) : null}

      {highlights.length > 0 ? (
        <BestSellers releases={highlights} title="Destacados" aside="Elegidos por el equipo" />
      ) : bestSellers.data && bestSellers.data.items.length > 0 ? (
        <BestSellers releases={bestSellers.data.items} />
      ) : null}

      <NewsletterBar />
    </>
  )
}
