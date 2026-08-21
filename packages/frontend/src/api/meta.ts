import { request } from "./client"

export interface CatalogMeta {
  genres: string[]
  labels: string[]
  formats: string[]
  conditions: string[]
  shippingFlatClp: number
  currency: string
  paymentsEnabled: boolean
}

/** Los géneros y la tarifa cambian poco: una sola petición por sesión alcanza. */
let cached: Promise<CatalogMeta> | null = null

export function fetchMeta(signal?: AbortSignal): Promise<CatalogMeta> {
  if (!cached) {
    cached = request<CatalogMeta>("/api/meta", { signal }).catch((error: unknown) => {
      cached = null
      throw error
    })
  }
  return cached
}

export function subscribeToNewsletter(email: string): Promise<{ subscribed: boolean }> {
  return request<{ subscribed: boolean }>("/api/newsletter", { method: "POST", body: { email } })
}
