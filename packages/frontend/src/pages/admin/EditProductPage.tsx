import { type FormEvent, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { ApiError } from "../../api/client"
import { updateRelease } from "../../api/releases"
import { AdminHeader } from "../../components/admin/AdminHeader"
import { ImageManager } from "../../components/admin/ImageManager"
import { ProductForm } from "../../components/admin/ProductForm"
import { ErrorState, LoadingState } from "../../components/ui/StateMessage"
import { useMeta } from "../../hooks/useMeta"
import { useRelease } from "../../hooks/useReleases"
import type { ReleaseImage, Track } from "../../types"

export function EditProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const meta = useMeta()
  const { data: release, loading, error } = useRelease(id)
  const [images, setImages] = useState<ReleaseImage[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Sólo se manda si Last.fm trajo pistas nuevas: si no, las de siempre.
  const [tracklist, setTracklist] = useState<Track[] | null>(null)

  // Las fotos se editan aparte del formulario: cada cambio ya viajó al API.
  useEffect(() => {
    if (release) setImages(release.images)
  }, [release])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!id) return
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    setSaveError(null)

    try {
      await updateRelease(id, {
        artist: String(form.get("artist") ?? ""),
        title: String(form.get("title") ?? ""),
        label: String(form.get("label") ?? ""),
        year: Number(form.get("year")),
        genre: String(form.get("genre") ?? ""),
        format: String(form.get("format") ?? "LP") as never,
        condition: String(form.get("condition") ?? "Nuevo") as never,
        price: Number(form.get("price")),
        stock: Number(form.get("stock") ?? 0),
        isNew: form.get("isNew") === "on",
        isPreorder: form.get("isPreorder") === "on",
        isFeatured: form.get("isFeatured") === "on",
        lastfmUrl: String(form.get("lastfmUrl") ?? "") || null,
        ...(tracklist ? { tracklist } : {}),
      })
      navigate("/admin/productos")
    } catch (caught) {
      setSaveError(
        caught instanceof ApiError
          ? (caught.issues?.join(" · ") ?? caught.message)
          : "No pudimos guardar el disco",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <AdminHeader title={release ? release.title : "Editar disco"} />

      <section className="flex flex-col gap-8 px-4 py-8 sm:px-6">
        {loading && !release ? <LoadingState label="Cargando disco" /> : null}
        {error ? <ErrorState message={error} /> : null}

        {release && id ? (
          <>
            <section className="flex max-w-3xl flex-col gap-4 border-2 border-ash p-4">
              <div>
                <h2 className="font-display text-2xl uppercase">Fotos</h2>
                <p className="mt-1 text-sm text-muted">
                  La portada es la que se ve en el catálogo y en el buscador. La primera que subas
                  queda marcada, y puedes pasarle el puesto a cualquier otra.
                </p>
              </div>
              <ImageManager
                releaseId={id}
                images={images}
                label={`${release.artist} — ${release.title}`}
                onChange={setImages}
              />
            </section>

            <ProductForm
              genres={meta.genres}
              formats={meta.formats}
              conditions={meta.conditions}
              submitting={submitting}
              error={saveError}
              onSubmit={handleSubmit}
              release={release}
              submitLabel="Guardar cambios"
              onTracklist={setTracklist}
            />
          </>
        ) : null}
      </section>
    </>
  )
}
