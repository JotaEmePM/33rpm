import type { FormEvent } from "react"
import type { Release } from "../../types"
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
}: ProductFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-8">
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
