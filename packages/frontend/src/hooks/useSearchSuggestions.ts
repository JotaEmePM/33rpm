import { fetchReleases, type ReleasePage } from "../api/releases"
import type { Release } from "../types"
import { useAsync } from "./useAsync"
import { useDebouncedValue } from "./useDebouncedValue"

/** Con una sola letra el catálogo entero coincide: no vale la pena preguntar. */
const MIN_LENGTH = 2

export const SUGGESTION_LIMIT = 6

export interface SearchSuggestions {
  /** El texto que produjo estos resultados, ya sin espacios y retrasado. */
  query: string
  items: Release[]
  loading: boolean
  /** Falso mientras el texto sea demasiado corto para consultar. */
  enabled: boolean
}

/**
 * Sugerencias del buscador. `useAsync` cancela la petición anterior en cuanto
 * llega otra, así que una respuesta lenta nunca pisa a la escrita después.
 */
export function useSearchSuggestions(input: string): SearchSuggestions {
  const query = useDebouncedValue(input.trim(), 200)
  const enabled = query.length >= MIN_LENGTH

  const { data, loading } = useAsync<ReleasePage | null>(
    (signal) =>
      enabled
        ? fetchReleases({ search: query, pageSize: SUGGESTION_LIMIT }, signal)
        : Promise.resolve(null),
    [query, enabled],
  )

  return { query, items: data?.items ?? [], loading: enabled && loading, enabled }
}
