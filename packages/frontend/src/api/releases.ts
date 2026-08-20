import type { Release } from "../types"
import { request } from "./client"

export interface ReleaseFilters {
  search?: string
  genre?: string | null
  formats?: string[]
  conditions?: string[]
  onlyInStock?: boolean
  onlyNew?: boolean
  onlyPreorder?: boolean
  onlyFeatured?: boolean
  sort?: string
  page?: number
  pageSize?: number
  /** Sólo la administración ve los discos ocultos. */
  includeHidden?: boolean
}

export interface ReleasePage {
  items: Release[]
  total: number
  page: number
  pageSize: number
  pages: number
}

export function toQueryString(filters: ReleaseFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set("q", filters.search)
  if (filters.genre) params.set("genero", filters.genre)
  if (filters.formats?.length) params.set("formato", filters.formats.join(","))
  if (filters.conditions?.length) params.set("estado", filters.conditions.join(","))
  if (filters.onlyInStock) params.set("stock", "1")
  if (filters.onlyNew) params.set("novedad", "1")
  if (filters.onlyPreorder) params.set("preventa", "1")
  if (filters.onlyFeatured) params.set("destacado", "1")
  if (filters.sort) params.set("orden", filters.sort)
  if (filters.page) params.set("pagina", String(filters.page))
  if (filters.pageSize) params.set("limite", String(filters.pageSize))
  if (filters.includeHidden) params.set("ocultos", "1")
  const query = params.toString()
  return query ? `?${query}` : ""
}

export function fetchReleases(filters: ReleaseFilters, signal?: AbortSignal): Promise<ReleasePage> {
  return request<ReleasePage>(`/api/releases${toQueryString(filters)}`, { signal })
}

export function fetchRelease(id: string, signal?: AbortSignal): Promise<Release> {
  return request<Release>(`/api/releases/${encodeURIComponent(id)}`, { signal })
}

/** Un disco nuevo nace visible: el alta no pregunta por algo que casi siempre es sí. */
export type ReleaseDraft = Omit<Release, "id" | "visible" | "isPreorder" | "isFeatured"> & {
  id?: string
  visible?: boolean
  isPreorder?: boolean
  isFeatured?: boolean
}

export function createRelease(draft: ReleaseDraft): Promise<Release> {
  return request<Release>("/api/releases", { method: "POST", body: draft, auth: true })
}

export function updateRelease(id: string, changes: Partial<Release>): Promise<Release> {
  return request<Release>(`/api/releases/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: changes,
    auth: true,
  })
}

export interface ImportResult {
  actualizados: number
  creados: number
  /** Discos que ya no venían en el archivo y dejaron de mostrarse. */
  ocultados: number
}

/**
 * Importación en bloque desde el CSV del panel: el API la aplica entera o ninguna.
 * `sincronizar` es lo que hace que los discos ausentes del archivo dejen de verse.
 */
export function importReleases(
  items: Record<string, unknown>[],
  sincronizar = true,
): Promise<ImportResult> {
  return request<ImportResult>("/api/releases/importar", {
    method: "POST",
    body: { items, sincronizar },
    auth: true,
  })
}

export function deleteRelease(id: string): Promise<void> {
  return request<void>(`/api/releases/${encodeURIComponent(id)}`, {
    method: "DELETE",
    auth: true,
  })
}
