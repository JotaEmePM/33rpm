import { del, put } from "@vercel/blob"
import { logger } from "./logger.js"

/** Tipos que aceptamos como carátula. */
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export async function storeImage(
  pathname: string,
  body: Buffer,
  contentType: string,
): Promise<{ url: string; pathname: string }> {
  const blob = await put(pathname, body, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  })
  return { url: blob.url, pathname: blob.pathname }
}

/**
 * Borrar del store no puede tumbar la operación: la base ya no referencia el
 * archivo, y un huérfano en Blob es menos grave que un error a mitad de camino.
 */
export async function deleteStoredImages(urls: string[]): Promise<void> {
  if (urls.length === 0) return
  try {
    await del(urls)
  } catch (error) {
    logger.error({ err: error, urls }, "no se pudieron borrar imágenes del store")
  }
}
