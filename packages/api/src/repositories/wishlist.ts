import { all, type Executor, run } from "../db/connection.js"
import type { Release } from "../types.js"
import { listReleasesByIds } from "./releases.js"

/**
 * Lista de deseos de cada cliente. Guarda ids, no copias del disco: si el
 * precio cambia, la lista muestra el precio de hoy.
 */
/**
 * Devuelve sólo lo que el cliente puede ver: si un disco se oculta, su marca
 * sigue en la tabla —y vuelve sola cuando el disco reaparece— pero no cuenta
 * mientras tanto, para que el contador y la lista digan lo mismo.
 */
export async function listWishlistIds(userId: string, on?: Executor): Promise<string[]> {
  const rows = await all<{ release_id: string }>(
    `SELECT w.release_id
     FROM wishlist w
     JOIN releases r ON r.id = w.release_id AND r.visible = 1
     WHERE w.user_id = ?
     ORDER BY w.created_at DESC, w.release_id`,
    [userId],
    on,
  )
  return rows.map((row) => row.release_id)
}

/** Los discos guardados, ya sin los que dejaron de estar a la venta. */
export async function listWishlist(userId: string, on?: Executor): Promise<Release[]> {
  return listReleasesByIds(await listWishlistIds(userId, on), {}, on)
}

/** Marcar dos veces el mismo disco no falla ni duplica. */
export async function addToWishlist(
  userId: string,
  releaseId: string,
  on?: Executor,
): Promise<void> {
  await run(
    "INSERT OR IGNORE INTO wishlist (user_id, release_id) VALUES (?, ?)",
    [userId, releaseId],
    on,
  )
}

export async function removeFromWishlist(
  userId: string,
  releaseId: string,
  on?: Executor,
): Promise<boolean> {
  const changes = await run(
    "DELETE FROM wishlist WHERE user_id = ? AND release_id = ?",
    [userId, releaseId],
    on,
  )
  return changes > 0
}
