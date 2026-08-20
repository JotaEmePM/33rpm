import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router"
import { ApiError } from "../../api/client"
import { createRelease } from "../../api/releases"
import { AdminHeader } from "../../components/admin/AdminHeader"
import { ProductForm } from "../../components/admin/ProductForm"
import { useMeta } from "../../hooks/useMeta"
import type { Track } from "../../types"

export function NewProductPage() {
  const navigate = useNavigate()
  const meta = useMeta()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Las pistas no se escriben a mano: llegan de Last.fm.
  const [tracklist, setTracklist] = useState<Track[]>([])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    setError(null)

    try {
      await createRelease({
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
        tracklist,
      })

      navigate("/admin/productos")
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.issues?.length ? caught.issues.join(" · ") : caught.message)
      } else {
        setError("No pudimos guardar el disco. ¿Está corriendo la API?")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <AdminHeader title="Nuevo disco" />
      <section className="px-4 py-8 sm:px-6">
        <ProductForm
          genres={meta.genres}
          formats={meta.formats}
          conditions={meta.conditions}
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
          onTracklist={setTracklist}
        />
      </section>
    </>
  )
}
