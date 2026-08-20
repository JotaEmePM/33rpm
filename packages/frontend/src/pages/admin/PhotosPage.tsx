import { useState } from "react"
import { AdminHeader } from "../../components/admin/AdminHeader"
import { ImageManager } from "../../components/admin/ImageManager"
import { ErrorState, LoadingState } from "../../components/ui/StateMessage"
import { useReleases } from "../../hooks/useReleases"
import type { ReleaseImage } from "../../types"

/**
 * Los discos que entran por CSV llegan sin fotos. Esta pantalla los junta a
 * todos para subirlas de corrido, sin ir disco por disco.
 */
export function PhotosPage() {
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useReleases(
    { onlyWithoutImages: true, includeHidden: true, pageSize: 100 },
    reloadKey,
  )
  // Lo subido en esta sesión se queda a la vista: la lista sólo se recarga a petición.
  const [uploaded, setUploaded] = useState<Record<string, ReleaseImage[]>>({})

  const pending = data?.items ?? []

  return (
    <>
      <AdminHeader title="Fotos pendientes" />

      <section className="flex flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label text-muted">Discos sin foto</p>
            <p className="font-display text-4xl">{data ? pending.length : "—"}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setUploaded({})
              setReloadKey((key) => key + 1)
            }}
            className="label min-h-11 border-2 border-paper px-4 transition-colors hover:bg-paper hover:text-ink"
          >
            Actualizar lista
          </button>
        </div>

        {error ? <ErrorState message={error} /> : null}
        {loading && !data ? <LoadingState label="Buscando discos sin foto" /> : null}

        {data && pending.length === 0 ? (
          <p className="border-2 border-ash p-10 text-center text-muted">
            Todos los discos del catálogo tienen al menos una foto.
          </p>
        ) : null}

        <ul className="flex flex-col gap-4">
          {pending.map((release) => (
            <li
              key={release.id}
              className="flex flex-col gap-4 border-2 border-ash p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <p className="font-display text-xl uppercase">{release.title}</p>
                <p className="text-sm text-muted">
                  {release.artist} · {release.label} · {release.format}
                </p>
              </div>
              <ImageManager
                releaseId={release.id}
                images={uploaded[release.id] ?? []}
                label={`${release.artist} — ${release.title}`}
                onChange={(images) =>
                  setUploaded((current) => ({ ...current, [release.id]: images }))
                }
                compact
              />
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
