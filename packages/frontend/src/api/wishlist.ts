import type { Release } from "../types"
import { request } from "./client"

/** Los ids bastan para pintar los corazones del catálogo. */
export function fetchWishlistIds(signal?: AbortSignal): Promise<{ ids: string[] }> {
  return request<{ ids: string[] }>("/api/lista-deseos/ids", { signal, auth: true })
}

export function fetchWishlist(signal?: AbortSignal): Promise<{ items: Release[] }> {
  return request<{ items: Release[] }>("/api/lista-deseos", { signal, auth: true })
}

export function addToWishlist(releaseId: string): Promise<{ ids: string[] }> {
  return request<{ ids: string[] }>(`/api/lista-deseos/${encodeURIComponent(releaseId)}`, {
    method: "PUT",
    auth: true,
  })
}

export function removeFromWishlist(releaseId: string): Promise<{ ids: string[] }> {
  return request<{ ids: string[] }>(`/api/lista-deseos/${encodeURIComponent(releaseId)}`, {
    method: "DELETE",
    auth: true,
  })
}
