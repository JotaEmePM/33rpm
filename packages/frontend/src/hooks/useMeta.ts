import { type CatalogMeta, fetchMeta } from "../api/meta"
import { useAsync } from "./useAsync"

const FALLBACK: CatalogMeta = {
  genres: [],
  labels: [],
  formats: ["LP", "2LP", "EP", '7"', "CD", "Box"],
  conditions: ["Nuevo", "Usado"],
  shippingFlatClp: 0,
  currency: "CLP",
  // Sin respuesta del API se asume lo prudente: no prometer un cobro.
  paymentsEnabled: false,
}

/** Géneros, formatos y tarifa de despacho vienen del backend; el fallback evita filtros vacíos. */
export function useMeta(): CatalogMeta {
  const { data } = useAsync((signal) => fetchMeta(signal), [])
  return data ?? FALLBACK
}
