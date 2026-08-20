import { all, type Executor, int, one, run, transaction } from "../db/connection.js"
import type { Release, ReleaseImage, ReleaseQuery, Track } from "../types.js"
import { imagesFor, listImages, removeImagesOf } from "./images.js"

interface ReleaseRow {
  id: string
  artist: string
  title: string
  year: number
  genre: string
  label: string
  format: string
  condition: string
  price: number
  stock: number
  is_new: number
  is_preorder: number
  is_featured: number
  visible: number
  lastfm_url: string | null
}

interface TrackRow {
  release_id: string
  position: string
  title: string
  duration: string
}

const SORT_SQL: Record<NonNullable<ReleaseQuery["sort"]>, string> = {
  recientes: "r.year DESC, r.created_at DESC",
  "precio-asc": "r.price ASC",
  "precio-desc": "r.price DESC",
  artista: "r.artist COLLATE NOCASE ASC",
}

function toRelease(row: ReleaseRow, tracklist: Track[], images: ReleaseImage[] = []): Release {
  return {
    id: row.id,
    artist: row.artist,
    title: row.title,
    year: int(row.year),
    genre: row.genre,
    label: row.label,
    format: row.format as Release["format"],
    condition: row.condition as Release["condition"],
    price: int(row.price),
    stock: int(row.stock),
    isNew: int(row.is_new) === 1,
    isPreorder: int(row.is_preorder) === 1,
    isFeatured: int(row.is_featured) === 1,
    visible: int(row.visible) === 1,
    lastfmUrl: row.lastfm_url,
    images,
    tracklist,
  }
}

async function tracksFor(releaseIds: string[], on?: Executor): Promise<Map<string, Track[]>> {
  const grouped = new Map<string, Track[]>()
  if (releaseIds.length === 0) return grouped

  const placeholders = releaseIds.map(() => "?").join(", ")
  const rows = await all<TrackRow>(
    `SELECT release_id, position, title, duration
     FROM tracks
     WHERE release_id IN (${placeholders})
     ORDER BY release_id, sort_order`,
    releaseIds,
    on,
  )

  for (const row of rows) {
    const list = grouped.get(row.release_id) ?? []
    list.push({ position: row.position, title: row.title, duration: row.duration })
    grouped.set(row.release_id, list)
  }
  return grouped
}

export async function listReleases(
  query: ReleaseQuery,
  on?: Executor,
): Promise<{ items: Release[]; total: number }> {
  const where: string[] = []
  const params: (string | number)[] = []

  if (query.search) {
    where.push("(r.artist LIKE ? OR r.title LIKE ? OR r.label LIKE ?)")
    const like = `%${query.search}%`
    params.push(like, like, like)
  }
  if (query.genre) {
    where.push("r.genre = ?")
    params.push(query.genre)
  }
  if (query.formats && query.formats.length > 0) {
    where.push(`r.format IN (${query.formats.map(() => "?").join(", ")})`)
    params.push(...query.formats)
  }
  if (query.conditions && query.conditions.length > 0) {
    where.push(`r.condition IN (${query.conditions.map(() => "?").join(", ")})`)
    params.push(...query.conditions)
  }
  if (query.onlyInStock) where.push("r.stock > 0")
  if (query.onlyNew) where.push("r.is_new = 1")
  if (query.onlyPreorder) where.push("r.is_preorder = 1")
  if (query.onlyFeatured) where.push("r.is_featured = 1")
  if (query.onlyWithoutImages) {
    where.push("NOT EXISTS (SELECT 1 FROM release_images i WHERE i.release_id = r.id)")
  }
  // Los ocultos sólo salen si quien pregunta lo pide expresamente.
  if (!query.includeHidden) where.push("r.visible = 1")

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""
  const orderSql = SORT_SQL[query.sort ?? "recientes"]

  const totals = await one<{ total: number }>(
    `SELECT COUNT(*) AS total FROM releases r ${whereSql}`,
    params,
    on,
  )

  const rows = await all<ReleaseRow>(
    `SELECT * FROM releases r ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`,
    [...params, query.pageSize, (query.page - 1) * query.pageSize],
    on,
  )

  const ids = rows.map((row) => row.id)
  const [tracks, covers] = await Promise.all([
    tracksFor(ids, on),
    imagesFor(ids, { onlyPrimary: true }, on),
  ])
  return {
    items: rows.map((row) => toRelease(row, tracks.get(row.id) ?? [], covers.get(row.id) ?? [])),
    total: int(totals?.total),
  }
}

/**
 * Discos concretos por id, en el orden que se pidan. La lista de deseos guarda
 * ids sueltos y necesita reconstruirlos con su portada.
 */
export async function listReleasesByIds(
  ids: string[],
  { includeHidden = false } = {},
  on?: Executor,
): Promise<Release[]> {
  if (ids.length === 0) return []

  const placeholders = ids.map(() => "?").join(", ")
  const rows = await all<ReleaseRow>(
    `SELECT * FROM releases WHERE id IN (${placeholders}) ${includeHidden ? "" : "AND visible = 1"}`,
    ids,
    on,
  )

  const found = rows.map((row) => row.id)
  const [tracks, covers] = await Promise.all([
    tracksFor(found, on),
    imagesFor(found, { onlyPrimary: true }, on),
  ])

  const byId = new Map(
    rows.map((row) => [row.id, toRelease(row, tracks.get(row.id) ?? [], covers.get(row.id) ?? [])]),
  )
  return ids
    .map((id) => byId.get(id))
    .filter((release): release is Release => release !== undefined)
}

export async function getRelease(id: string, on?: Executor): Promise<Release | null> {
  const row = await one<ReleaseRow>("SELECT * FROM releases WHERE id = ?", [id], on)
  if (!row) return null
  const [tracks, images] = await Promise.all([tracksFor([id], on), listImages(id, on)])
  return toRelease(row, tracks.get(id) ?? [], images)
}

async function replaceTracks(releaseId: string, tracklist: Track[], on: Executor): Promise<void> {
  await run("DELETE FROM tracks WHERE release_id = ?", [releaseId], on)
  for (const [index, track] of tracklist.entries()) {
    await run(
      "INSERT INTO tracks (release_id, position, title, duration, sort_order) VALUES (?, ?, ?, ?, ?)",
      [releaseId, track.position, track.title, track.duration, index],
      on,
    )
  }
}

export async function createRelease(release: Release, on?: Executor): Promise<Release> {
  if (!on) return transaction((tx) => createRelease(release, tx))

  await run(
    `INSERT INTO releases (id, artist, title, year, genre, label, format, condition, price, stock,
                           is_new, is_preorder, is_featured, visible, lastfm_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      release.id,
      release.artist,
      release.title,
      release.year,
      release.genre,
      release.label,
      release.format,
      release.condition,
      release.price,
      release.stock,
      release.isNew ? 1 : 0,
      release.isPreorder ? 1 : 0,
      release.isFeatured ? 1 : 0,
      release.visible === false ? 0 : 1,
      release.lastfmUrl ?? null,
    ],
    on,
  )
  await replaceTracks(release.id, release.tracklist, on)
  return release
}

export async function updateRelease(
  id: string,
  changes: Partial<Release>,
  on?: Executor,
): Promise<Release | null> {
  if (!on) return transaction((tx) => updateRelease(id, changes, tx))

  const current = await getRelease(id, on)
  if (!current) return null

  const next: Release = { ...current, ...changes, id }

  await run(
    `UPDATE releases
     SET artist = ?, title = ?, year = ?, genre = ?, label = ?, format = ?, condition = ?,
         price = ?, stock = ?, is_new = ?, is_preorder = ?, is_featured = ?, visible = ?,
         lastfm_url = ?
     WHERE id = ?`,
    [
      next.artist,
      next.title,
      next.year,
      next.genre,
      next.label,
      next.format,
      next.condition,
      next.price,
      next.stock,
      next.isNew ? 1 : 0,
      next.isPreorder ? 1 : 0,
      next.isFeatured ? 1 : 0,
      next.visible ? 1 : 0,
      next.lastfmUrl ?? null,
      id,
    ],
    on,
  )
  if (changes.tracklist) await replaceTracks(id, changes.tracklist, on)
  return next
}

/**
 * Borra el disco con sus pistas, sus fotos y las marcas de lista de deseos. El
 * `ON DELETE CASCADE` sólo actúa con las claves foráneas activas, y en el
 * SQLite local vienen apagadas: se hace a mano para que el resultado sea el
 * mismo contra Turso que contra un archivo.
 */
export async function deleteRelease(id: string, on?: Executor): Promise<ReleaseImage[] | null> {
  if (!on) return transaction((tx) => deleteRelease(id, tx))

  const images = await removeImagesOf(id, on)
  await run("DELETE FROM tracks WHERE release_id = ?", [id], on)
  await run("DELETE FROM wishlist WHERE release_id = ?", [id], on)
  const deleted = await run("DELETE FROM releases WHERE id = ?", [id], on)
  return deleted > 0 ? images : null
}

/** Cuáles de esos ids ya están en el catálogo, en una sola consulta. */
export async function existingReleaseIds(ids: string[], on?: Executor): Promise<Set<string>> {
  if (ids.length === 0) return new Set()

  const placeholders = ids.map(() => "?").join(", ")
  const rows = await all<{ id: string }>(
    `SELECT id FROM releases WHERE id IN (${placeholders})`,
    ids,
    on,
  )
  return new Set(rows.map((row) => row.id))
}

export async function releaseExists(id: string, on?: Executor): Promise<boolean> {
  return (await one("SELECT 1 FROM releases WHERE id = ?", [id], on)) !== null
}

/** Descuenta stock sólo si alcanza; devuelve false cuando no queda suficiente. */
export async function decrementStock(
  id: string,
  quantity: number,
  on?: Executor,
): Promise<boolean> {
  const changes = await run(
    "UPDATE releases SET stock = stock - ? WHERE id = ? AND stock >= ?",
    [quantity, id, quantity],
    on,
  )
  return changes > 0
}

/**
 * Oculta los discos que no estén en la lista y devuelve cuáles fueron.
 * Es lo que aplica la importación: el archivo subido es la foto completa del
 * catálogo, y lo que ya no aparece deja de mostrarse en la tienda.
 */
export async function hideMissing(keepIds: string[], on?: Executor): Promise<string[]> {
  const placeholders = keepIds.map(() => "?").join(", ")
  const filter = keepIds.length > 0 ? `AND id NOT IN (${placeholders})` : ""

  const rows = await all<{ id: string }>(
    `SELECT id FROM releases WHERE visible = 1 ${filter}`,
    keepIds,
    on,
  )
  if (rows.length === 0) return []

  await run(
    `UPDATE releases SET visible = 0 WHERE id IN (${rows.map(() => "?").join(", ")})`,
    rows.map((row) => row.id),
    on,
  )
  return rows.map((row) => row.id)
}

export async function listGenres(on?: Executor): Promise<string[]> {
  const rows = await all<{ genre: string }>(
    "SELECT DISTINCT genre FROM releases WHERE visible = 1 ORDER BY genre COLLATE NOCASE",
    [],
    on,
  )
  return rows.map((row) => row.genre)
}

export async function listLabels(on?: Executor): Promise<string[]> {
  const rows = await all<{ label: string }>(
    "SELECT DISTINCT label FROM releases WHERE visible = 1 ORDER BY label COLLATE NOCASE",
    [],
    on,
  )
  return rows.map((row) => row.label)
}

export async function countReleases(on?: Executor): Promise<number> {
  const row = await one<{ total: number }>("SELECT COUNT(*) AS total FROM releases", [], on)
  return int(row?.total)
}
