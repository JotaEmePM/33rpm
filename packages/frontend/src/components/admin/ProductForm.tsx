import { type FormEvent, useRef, useState } from "react"
import { ApiError } from "../../api/client"
import { fetchAlbumInfo } from "../../api/lastfm"
import type { Release, Track } from "../../types"
import { Button } from "../ui/Button"
import { Field } from "../ui/Field"
import { Select } from "../ui/Select"

const MARKS = [
  { name: "isNew", label: "Marcar como novedad del drop" },
  { name: "isPreorder", label: "En preventa: anunciado antes de llegar a la tienda" },
  { name: "isFeatured", label: "Destacado en la portada" },
] as const satisfies readonly { name: keyof Release; label: string }[]

interface ProductFormProps {
  genres: string[]
  formats: string[]
  conditions: string[]
  submitting: boolean
  error: string | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  /** Con un disco, el formulario edita en vez de dar de alta. */
  release?: Release
  submitLabel?: string
  /** Las pistas traídas de Last.fm: el formulario no las edita, sólo las carga. */
  onTracklist?: (tracklist: Track[]) => void
}

export function ProductForm({
  genres,
  formats,
  conditions,
  submitting,
  error,
  onSubmit,
  release,
  submitLabel = "Guardar disco",
  onTracklist,
}: ProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [lastfmMessage, setLastfmMessage] = useState<string | null>(null)

  function setValue(name: string, value: string) {
    const field = formRef.current?.elements.namedItem(name)
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
      field.value = value
    }
  }

  async function handleLastfm() {
    const field = formRef.current?.elements.namedItem("lastfmUrl")
    const url = field instanceof HTMLInputElement ? field.value.trim() : ""
    if (!url) {
      setLastfmMessage("Pega antes la URL del álbum en Last.fm")
      return
    }

    setLookingUp(true)
    setLastfmMessage(null)
    try {
      const album = await fetchAlbumInfo(url)
      setValue("artist", album.artist)
      setValue("title", album.title)

      // El género sólo se toca si alguna etiqueta coincide con las de la tienda.
      const match = album.tags.find((tag) =>
        genres.some((genre) => genre.toLowerCase() === tag.toLowerCase()),
      )
      if (match) {
        setValue("genre", genres.find((genre) => genre.toLowerCase() === match.toLowerCase()) ?? "")
      }

      onTracklist?.(album.tracklist)
      setLastfmMessage(
        `${album.artist} — ${album.title}${
          album.tracklist.length > 0 ? ` · ${album.tracklist.length} pistas cargadas` : ""
        }`,
      )
    } catch (error) {
      setLastfmMessage(error instanceof ApiError ? error.message : "No pudimos consultar Last.fm")
    } finally {
      setLookingUp(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="font-display text-2xl uppercase">Desde Last.fm</legend>
        <p className="text-sm text-muted">
          Pega la dirección del álbum en Last.fm y rellenamos artista, título y la lista de pistas.
          Lo que escribas a mano manda sobre lo que traiga.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field
            label="URL del álbum"
            name="lastfmUrl"
            required={false}
            defaultValue={release?.lastfmUrl ?? undefined}
            className="flex-1"
          />
          <Button variant="outline" onClick={handleLastfm} disabled={lookingUp}>
            {lookingUp ? "Buscando…" : "Traer datos"}
          </Button>
        </div>
        {lastfmMessage ? (
          <p className="border-2 border-ash p-3 text-sm text-muted" role="status">
            {lastfmMessage}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-display text-2xl uppercase">Ficha</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Artista" name="artist" defaultValue={release?.artist} />
          <Field label="Título" name="title" defaultValue={release?.title} />
          <Field label="Sello" name="label" defaultValue={release?.label} />
          <Field
            label="Año"
            name="year"
            type="number"
            defaultValue={release ? String(release.year) : undefined}
          />
          <Select label="Género" name="genre" options={genres} defaultValue={release?.genre} />
          <Select label="Formato" name="format" options={formats} defaultValue={release?.format} />
          <Select
            label="Estado"
            name="condition"
            options={conditions}
            defaultValue={release?.condition}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-display text-2xl uppercase">Venta</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Precio (CLP)"
            name="price"
            type="number"
            defaultValue={release ? String(release.price) : undefined}
          />
          <Field
            label="Stock"
            name="stock"
            type="number"
            defaultValue={release ? String(release.stock) : undefined}
          />
        </div>
        {MARKS.map((mark) => (
          <label
            key={mark.name}
            className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"
          >
            <input
              type="checkbox"
              name={mark.name}
              defaultChecked={release?.[mark.name] ?? false}
              className="size-4 shrink-0 appearance-none border-2 border-steel checked:border-volt checked:bg-volt"
            />
            {mark.label}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-display text-2xl uppercase">Carátula</legend>
        <p className="text-sm text-muted">
          {release
            ? "Las fotos se gestionan más abajo."
            : "Guarda el disco y podrás subirle fotos enseguida."}
        </p>
      </fieldset>

      {error ? (
        <p className="border-2 border-volt p-4 text-sm text-volt" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Guardando…" : submitLabel}
        </Button>
        <Button type="reset" variant="outline" size="lg">
          Limpiar
        </Button>
      </div>
    </form>
  )
}
