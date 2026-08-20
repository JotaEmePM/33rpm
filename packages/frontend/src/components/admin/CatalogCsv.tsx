import { type ChangeEvent, useRef, useState } from "react"
import { ApiError } from "../../api/client"
import { type ImportResult, importReleases } from "../../api/releases"
import {
  CATALOG_CSV_HEADERS,
  type ImportRow,
  parseCatalogCsv,
  releasesToCsv,
  translateIssue,
} from "../../lib/catalog-csv"
import { downloadCsv } from "../../lib/csv"
import type { Release } from "../../types"
import { Button } from "../ui/Button"

interface CatalogCsvProps {
  releases: Release[]
  /** Se llama cuando la importación se aplicó y la tabla debe recargarse. */
  onImported: () => void
}

type Status = "idle" | "confirmando" | "subiendo" | "listo"

export function CatalogCsv({ releases, onImported }: CatalogCsvProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [pending, setPending] = useState<ImportRow[]>([])
  const [willHide, setWillHide] = useState<Release[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [issues, setIssues] = useState<string[]>([])

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(`33rpm-catalogo-${today}.csv`, releasesToCsv(releases))
  }

  async function upload(rows: ImportRow[]) {
    setStatus("subiendo")
    try {
      setResult(await importReleases(rows))
      setStatus("listo")
      setPending([])
      setWillHide([])
      onImported()
    } catch (error) {
      setStatus("idle")
      setIssues(
        error instanceof ApiError
          ? (error.issues?.map(translateIssue) ?? [error.message])
          : ["No pudimos subir el archivo"],
      )
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Elegir el mismo archivo dos veces seguidas no dispara change si no se limpia.
    event.target.value = ""
    if (!file) return

    setIssues([])
    setResult(null)
    setWillHide([])

    const { rows, issues: localIssues } = parseCatalogCsv(await file.text())
    if (localIssues.length > 0) {
      setIssues(localIssues)
      setStatus("idle")
      return
    }

    // Lo que el archivo no menciona se oculta, y eso conviene verlo antes de aplicarlo.
    const present = new Set(rows.map((row) => String(row.id ?? "")).filter(Boolean))
    const missing = releases.filter((release) => release.visible && !present.has(release.id))

    if (missing.length > 0) {
      setPending(rows)
      setWillHide(missing)
      setStatus("confirmando")
      return
    }

    await upload(rows)
  }

  return (
    <section className="flex flex-col gap-4 border-2 border-ash p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl">
          <p className="label text-volt">Inventario en CSV</p>
          <p className="mt-1 text-sm text-muted">
            Descarga el catálogo, edítalo en tu planilla y vuelve a subirlo. El archivo es la foto
            completa de la tienda: las filas con <strong className="text-paper">id vacío</strong> se
            dan de alta, una celda en blanco deja ese dato como está, y{" "}
            <strong className="text-paper">un disco que ya no aparezca deja de mostrarse</strong>.
            Para ocultar uno sin sacarlo del archivo, pon <strong className="text-paper">-1</strong>{" "}
            en su stock o <strong className="text-paper">no</strong> en la columna visible.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport} disabled={releases.length === 0}>
            Exportar CSV
          </Button>
          <Button
            onClick={() => fileInput.current?.click()}
            disabled={status === "subiendo" || status === "confirmando"}
          >
            {status === "subiendo" ? "Subiendo…" : "Subir CSV"}
          </Button>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFile}
        className="sr-only"
        aria-label="Archivo CSV del catálogo"
      />

      <p className="text-xs text-muted">Columnas: {CATALOG_CSV_HEADERS.join(" · ")}</p>

      {status === "confirmando" ? (
        <div className="flex flex-col gap-3 border-2 border-volt p-4">
          <p className="label text-volt">
            {willHide.length} {willHide.length === 1 ? "disco dejará" : "discos dejarán"} de verse
          </p>
          <p className="text-sm text-muted">
            No {willHide.length === 1 ? "viene" : "vienen"} en el archivo. Seguirán en el catálogo
            con su stock, pero fuera de la tienda hasta que los vuelvas a mostrar.
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {willHide.map((release) => (
              <li key={release.id}>
                {release.artist} — {release.title}
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <Button onClick={() => upload(pending)}>Aplicar de todos modos</Button>
            <Button
              variant="outline"
              onClick={() => {
                setPending([])
                setWillHide([])
                setStatus("idle")
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {result ? (
        <p className="border-2 border-volt p-4 text-sm text-volt" role="status">
          {result.actualizados}{" "}
          {result.actualizados === 1 ? "disco actualizado" : "discos actualizados"}
          {result.creados > 0
            ? `, ${result.creados} ${result.creados === 1 ? "nuevo" : "nuevos"}`
            : ""}
          {result.ocultados > 0
            ? ` y ${result.ocultados} ${result.ocultados === 1 ? "oculto" : "ocultos"}`
            : ""}
          .
        </p>
      ) : null}

      {issues.length > 0 ? (
        <div className="border-2 border-volt p-4" role="alert">
          <p className="label text-volt">No se aplicó ningún cambio</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
