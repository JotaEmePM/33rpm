import { useState } from "react"
import { deleteRelease, updateRelease } from "../../api/releases"
import { AdminHeader } from "../../components/admin/AdminHeader"
import { CatalogCsv } from "../../components/admin/CatalogCsv"
import { ProductTable } from "../../components/admin/ProductTable"
import { LinkButton } from "../../components/ui/LinkButton"
import { ErrorState, LoadingState } from "../../components/ui/StateMessage"
import { useReleases } from "../../hooks/useReleases"
import type { Release } from "../../types"

export function AdminProductsPage() {
  const [reloadKey, setReloadKey] = useState(0)
  // La administración es el único sitio donde se ven los discos ocultos.
  const { data, loading, error } = useReleases({ pageSize: 100, includeHidden: true }, reloadKey)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setActionError(null)
    try {
      await deleteRelease(id)
      setReloadKey((key) => key + 1)
    } catch {
      setActionError("No pudimos eliminar el disco")
    }
  }

  async function handleToggleVisible(release: Release) {
    setActionError(null)
    try {
      await updateRelease(release.id, { visible: !release.visible })
      setReloadKey((key) => key + 1)
    } catch {
      setActionError("No pudimos cambiar la visibilidad del disco")
    }
  }

  const releases = data?.items ?? []
  const outOfStock = releases.filter((release) => release.stock === 0).length
  const hidden = releases.filter((release) => !release.visible).length

  return (
    <>
      <AdminHeader
        title="Productos"
        action={<LinkButton to="/admin/productos/nuevo">Nuevo disco</LinkButton>}
      />

      <section className="flex flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex gap-8">
          <div>
            <p className="label text-muted">En catálogo</p>
            <p className="font-display text-4xl">{data?.total ?? "—"}</p>
          </div>
          <div>
            <p className="label text-muted">Agotados</p>
            <p className="font-display text-4xl text-volt">{data ? outOfStock : "—"}</p>
          </div>
          <div>
            <p className="label text-muted">Ocultos</p>
            <p className="font-display text-4xl text-muted">{data ? hidden : "—"}</p>
          </div>
        </div>

        <CatalogCsv releases={releases} onImported={() => setReloadKey((key) => key + 1)} />

        {error ? <ErrorState message={error} /> : null}
        {actionError ? <ErrorState message={actionError} /> : null}
        {loading && !data ? <LoadingState label="Cargando productos" /> : null}
        {data ? (
          <ProductTable
            releases={releases}
            onDelete={handleDelete}
            onToggleVisible={handleToggleVisible}
          />
        ) : null}
      </section>
    </>
  )
}
