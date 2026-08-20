import type { FormEvent } from "react"
import { Button } from "../ui/Button"
import { Field } from "../ui/Field"
import { Select } from "../ui/Select"

const MARKS = [
  { name: "isNew", label: "Marcar como novedad del drop" },
  { name: "isPreorder", label: "En preventa: anunciado antes de llegar a la tienda" },
  { name: "isFeatured", label: "Destacado en la portada" },
] as const

interface ProductFormProps {
  genres: string[]
  formats: string[]
  conditions: string[]
  submitting: boolean
  error: string | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function ProductForm({
  genres,
  formats,
  conditions,
  submitting,
  error,
  onSubmit,
}: ProductFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="font-display text-2xl uppercase">Ficha</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Artista" name="artist" />
          <Field label="Título" name="title" />
          <Field label="Sello" name="label" />
          <Field label="Año" name="year" type="number" />
          <Select label="Género" name="genre" options={genres} />
          <Select label="Formato" name="format" options={formats} />
          <Select label="Estado" name="condition" options={conditions} />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-display text-2xl uppercase">Venta</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Precio (CLP)" name="price" type="number" />
          <Field label="Stock" name="stock" type="number" />
        </div>
        {MARKS.map((mark) => (
          <label
            key={mark.name}
            className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"
          >
            <input
              type="checkbox"
              name={mark.name}
              className="size-4 shrink-0 appearance-none border-2 border-steel checked:border-volt checked:bg-volt"
            />
            {mark.label}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-display text-2xl uppercase">Carátula</legend>
        <p className="text-sm text-muted">
          Subida de imágenes pendiente — hoy el catálogo dibuja una carátula de relleno.
        </p>
      </fieldset>

      {error ? (
        <p className="border-2 border-volt p-4 text-sm text-volt" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar disco"}
        </Button>
        <Button type="reset" variant="outline" size="lg">
          Limpiar
        </Button>
      </div>
    </form>
  )
}
