import { addImage, countImages } from "../repositories/images.js"
import type { ReleaseImage } from "../types.js"
import { IMAGE_TYPES, isBlobConfigured, MAX_IMAGE_BYTES, storeImage } from "./blob.js"
import { logger } from "./logger.js"
import { slugify } from "./validation.js"

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
}

/**
 * Copia al store la portada que publica Last.fm y la deja como foto del disco.
 *
 * Sólo actúa si el disco no tiene ninguna foto: una carátula subida a mano
 * siempre gana a la de Last.fm. Nunca lanza —es un extra, no parte del alta—,
 * así que un fallo se registra y el disco queda sin foto.
 */
export async function importCoverFromLastfm(
  releaseId: string,
  imageUrl: string | null,
): Promise<ReleaseImage | null> {
  if (!imageUrl || !isBlobConfigured()) return null

  try {
    if ((await countImages(releaseId)) > 0) return null

    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) throw new Error(`Last.fm devolvió ${response.status} al pedir la portada`)

    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim()
    if (!IMAGE_TYPES.includes(contentType as (typeof IMAGE_TYPES)[number])) {
      throw new Error(`La portada llegó como ${contentType || "tipo desconocido"}`)
    }

    const body = Buffer.from(await response.arrayBuffer())
    if (body.length === 0 || body.length > MAX_IMAGE_BYTES) {
      throw new Error(`La portada pesa ${body.length} bytes`)
    }

    const name = slugify(releaseId) || "portada"
    const stored = await storeImage(
      `discos/${releaseId}/${name}-lastfm.${EXTENSIONS[contentType]}`,
      body,
      contentType,
    )

    const image = await addImage(releaseId, stored)
    logger.info({ releaseId }, "portada copiada desde Last.fm")
    return image
  } catch (error) {
    logger.warn({ err: error, releaseId, imageUrl }, "no se pudo copiar la portada de Last.fm")
    return null
  }
}
