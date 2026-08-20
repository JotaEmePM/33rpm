import type { LoaderFunctionArgs } from "react-router"
import { fetchRelease, fetchReleases, type ReleaseFilters } from "../api/releases"

export const CATALOG_PAGE_SIZE = 48

/** Los filtros del catálogo viven en la URL: así son enlazables y cada cambio es una navegación. */
export function parseCatalogParams(params: URLSearchParams): ReleaseFilters {
  const list = (key: string) => {
    const value = params.get(key)
    return value ? value.split(",").filter(Boolean) : []
  }

  return {
    search: params.get("q") ?? undefined,
    genre: params.get("genero"),
    formats: list("formato"),
    conditions: list("estado"),
    onlyInStock: params.get("stock") === "1",
    onlyNew: params.get("novedad") === "1",
    sort: params.get("orden") ?? "recientes",
    pageSize: CATALOG_PAGE_SIZE,
  }
}

export function catalogLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  return fetchReleases(parseCatalogParams(url.searchParams), request.signal)
}

export function releaseLoader({ params, request }: LoaderFunctionArgs) {
  if (!params.id) throw new Error("Falta el identificador del disco")
  return fetchRelease(params.id, request.signal)
}
