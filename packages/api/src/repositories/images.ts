import { randomUUID } from "node:crypto"
import { all, type Executor, int, one, run, transaction } from "../db/connection.js"
import type { ReleaseImage } from "../types.js"

interface ImageRow {
  id: string
  release_id: string
  url: string
  pathname: string
  is_primary: number
  sort_order: number
}

/** La principal primero: los listados se quedan con la primera y ya está. */
const ORDER = "ORDER BY is_primary DESC, sort_order, created_at, id"

function toImage(row: ImageRow): ReleaseImage {
  return {
    id: row.id,
    url: row.url,
    pathname: row.pathname,
    isPrimary: int(row.is_primary) === 1,
  }
}

export async function listImages(releaseId: string, on?: Executor): Promise<ReleaseImage[]> {
  const rows = await all<ImageRow>(
    `SELECT * FROM release_images WHERE release_id = ? ${ORDER}`,
    [releaseId],
    on,
  )
  return rows.map(toImage)
}

/**
 * Imágenes de varios discos a la vez, para no consultar una por fila.
 * Con `onlyPrimary` trae sólo la portada de cada uno, que es lo que pinta el catálogo.
 */
export async function imagesFor(
  releaseIds: string[],
  { onlyPrimary = false } = {},
  on?: Executor,
): Promise<Map<string, ReleaseImage[]>> {
  const grouped = new Map<string, ReleaseImage[]>()
  if (releaseIds.length === 0) return grouped

  const placeholders = releaseIds.map(() => "?").join(", ")
  const rows = await all<ImageRow>(
    `SELECT * FROM release_images
     WHERE release_id IN (${placeholders}) ${onlyPrimary ? "AND is_primary = 1" : ""}
     ${ORDER}`,
    releaseIds,
    on,
  )

  for (const row of rows) {
    const list = grouped.get(row.release_id) ?? []
    list.push(toImage(row))
    grouped.set(row.release_id, list)
  }
  return grouped
}

export async function countImages(releaseId: string, on?: Executor): Promise<number> {
  const row = await one<{ total: number }>(
    "SELECT COUNT(*) AS total FROM release_images WHERE release_id = ?",
    [releaseId],
    on,
  )
  return int(row?.total)
}

/** La primera foto de un disco queda como principal sin que nadie tenga que decirlo. */
export async function addImage(
  releaseId: string,
  image: { url: string; pathname: string },
  on?: Executor,
): Promise<ReleaseImage> {
  if (!on) return transaction((tx) => addImage(releaseId, image, tx))

  const existing = await countImages(releaseId, on)
  const id = randomUUID()

  await run(
    `INSERT INTO release_images (id, release_id, url, pathname, is_primary, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, releaseId, image.url, image.pathname, existing === 0 ? 1 : 0, existing],
    on,
  )

  return { id, url: image.url, pathname: image.pathname, isPrimary: existing === 0 }
}

/** Deja una sola principal: la elegida. */
export async function setPrimaryImage(
  releaseId: string,
  imageId: string,
  on?: Executor,
): Promise<boolean> {
  if (!on) return transaction((tx) => setPrimaryImage(releaseId, imageId, tx))

  const target = await one<ImageRow>(
    "SELECT * FROM release_images WHERE id = ? AND release_id = ?",
    [imageId, releaseId],
    on,
  )
  if (!target) return false

  await run("UPDATE release_images SET is_primary = 0 WHERE release_id = ?", [releaseId], on)
  await run("UPDATE release_images SET is_primary = 1 WHERE id = ?", [imageId], on)
  return true
}

/**
 * Quita la imagen y devuelve su ruta en el store para poder borrarla también
 * allí. Si era la principal, la siguiente ocupa su lugar: un disco con fotos
 * nunca se queda sin portada.
 */
export async function removeImage(
  releaseId: string,
  imageId: string,
  on?: Executor,
): Promise<ReleaseImage | null> {
  if (!on) return transaction((tx) => removeImage(releaseId, imageId, tx))

  const row = await one<ImageRow>(
    "SELECT * FROM release_images WHERE id = ? AND release_id = ?",
    [imageId, releaseId],
    on,
  )
  if (!row) return null

  await run("DELETE FROM release_images WHERE id = ?", [imageId], on)

  if (int(row.is_primary) === 1) {
    const next = await one<ImageRow>(
      `SELECT * FROM release_images WHERE release_id = ? ${ORDER} LIMIT 1`,
      [releaseId],
      on,
    )
    if (next) await run("UPDATE release_images SET is_primary = 1 WHERE id = ?", [next.id], on)
  }

  return toImage(row)
}

/** Todas las rutas de un disco: lo que hay que borrar del store al eliminarlo. */
export async function removeImagesOf(releaseId: string, on?: Executor): Promise<ReleaseImage[]> {
  const images = await listImages(releaseId, on)
  if (images.length > 0) {
    await run("DELETE FROM release_images WHERE release_id = ?", [releaseId], on)
  }
  return images
}
