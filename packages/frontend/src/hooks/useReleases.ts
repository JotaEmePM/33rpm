import { useMemo } from "react"
import { fetchRelease, fetchReleases, type ReleaseFilters } from "../api/releases"
import { useAsync } from "./useAsync"

/**
 * `refreshKey` fuerza una recarga tras crear o eliminar discos.
 * Los filtros viajan serializados: así un objeto nuevo con el mismo contenido no repite la petición.
 */
export function useReleases(filters: ReleaseFilters, refreshKey = 0) {
  const key = useMemo(() => JSON.stringify(filters), [filters])

  return useAsync(
    (signal) => fetchReleases(JSON.parse(key) as ReleaseFilters, signal),
    [key, refreshKey],
  )
}

export function useRelease(id: string | undefined) {
  return useAsync(
    (signal) => (id ? fetchRelease(id, signal) : Promise.reject(new Error("Falta el id"))),
    [id],
  )
}
