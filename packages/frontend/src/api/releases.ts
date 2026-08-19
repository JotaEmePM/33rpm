import type { Release } from "../types"
import { request } from "./client"

export interface ReleaseFilters {
  search?: string
  genre?: string | null
  formats?: string[]
  conditions?: string[]
  onlyInStock?: boolean
  onlyNew?: boolean
  sort?: string
  page?: number
  pageSize?: number
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
  if (filters.sort) params.set("orden", filters.sort)
  if (filters.page) params.set("pagina", String(filters.page))
  if (filters.pageSize) params.set("limite", String(filters.pageSize))
  const query = params.toString()
  return query ? `?${query}` : ""
}

export function fetchReleases(filters: ReleaseFilters, signal?: AbortSignal): Promise<ReleasePage> {
  return request<ReleasePage>(`/api/releases${toQueryString(filters)}`, { signal })
}

export function fetchRelease(id: string, signal?: AbortSignal): Promise<Release> {
  return request<Release>(`/api/releases/${encodeURIComponent(id)}`, { signal })
}

export type ReleaseDraft = Omit<Release, "id"> & { id?: string }

export function createRelease(draft: ReleaseDraft): Promise<Release> {
  return request<Release>("/api/releases", { method: "POST", body: draft })
}

export function updateRelease(id: string, changes: Partial<Release>): Promise<Release> {
  return request<Release>(`/api/releases/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: changes,
  })
}

export function deleteRelease(id: string): Promise<void> {
  return request<void>(`/api/releases/${encodeURIComponent(id)}`, { method: "DELETE" })
}
