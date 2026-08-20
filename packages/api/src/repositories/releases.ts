import { all, type Executor, int, one, run, transaction } from "../db/connection.js"
import type { Release, ReleaseQuery, Track } from "../types.js"

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

function toRelease(row: ReleaseRow, tracklist: Track[]): Release {
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

  const tracks = await tracksFor(
    rows.map((row) => row.id),
    on,
  )
  return {
    items: rows.map((row) => toRelease(row, tracks.get(row.id) ?? [])),
    total: int(totals?.total),
  }
}

export async function getRelease(id: string, on?: Executor): Promise<Release | null> {
  const row = await one<ReleaseRow>("SELECT * FROM releases WHERE id = ?", [id], on)
  if (!row) return null
  const tracks = await tracksFor([id], on)
  return toRelease(row, tracks.get(id) ?? [])
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
    `INSERT INTO releases (id, artist, title, year, genre, label, format, condition, price, stock, is_new)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
         price = ?, stock = ?, is_new = ?
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
      id,
    ],
    on,
  )
  if (changes.tracklist) await replaceTracks(id, changes.tracklist, on)
  return next
}

export async function deleteRelease(id: string, on?: Executor): Promise<boolean> {
  return (await run("DELETE FROM releases WHERE id = ?", [id], on)) > 0
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

export async function listGenres(on?: Executor): Promise<string[]> {
  const rows = await all<{ genre: string }>(
    "SELECT DISTINCT genre FROM releases ORDER BY genre COLLATE NOCASE",
    [],
    on,
  )
  return rows.map((row) => row.genre)
}

export async function listLabels(on?: Executor): Promise<string[]> {
  const rows = await all<{ label: string }>(
    "SELECT DISTINCT label FROM releases ORDER BY label COLLATE NOCASE",
    [],
    on,
  )
  return rows.map((row) => row.label)
}

export async function countReleases(on?: Executor): Promise<number> {
  const row = await one<{ total: number }>("SELECT COUNT(*) AS total FROM releases", [], on)
  return int(row?.total)
}
