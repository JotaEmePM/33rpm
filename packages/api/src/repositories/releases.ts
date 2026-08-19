import { db, transaction } from "../db/connection.js"
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
    year: row.year,
    genre: row.genre,
    label: row.label,
    format: row.format as Release["format"],
    condition: row.condition as Release["condition"],
    price: row.price,
    stock: row.stock,
    isNew: row.is_new === 1,
    tracklist,
  }
}

function tracksFor(releaseIds: string[]): Map<string, Track[]> {
  const grouped = new Map<string, Track[]>()
  if (releaseIds.length === 0) return grouped

  const placeholders = releaseIds.map(() => "?").join(", ")
  const rows = db
    .prepare(
      `SELECT release_id, position, title, duration
       FROM tracks
       WHERE release_id IN (${placeholders})
       ORDER BY release_id, sort_order`,
    )
    .all(...releaseIds) as unknown as TrackRow[]

  for (const row of rows) {
    const list = grouped.get(row.release_id) ?? []
    list.push({ position: row.position, title: row.title, duration: row.duration })
    grouped.set(row.release_id, list)
  }
  return grouped
}

export function listReleases(query: ReleaseQuery): { items: Release[]; total: number } {
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

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM releases r ${whereSql}`)
    .get(...params) as unknown as { total: number }

  const rows = db
    .prepare(`SELECT * FROM releases r ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`)
    .all(...params, query.pageSize, (query.page - 1) * query.pageSize) as unknown as ReleaseRow[]

  const tracks = tracksFor(rows.map((row) => row.id))
  return { items: rows.map((row) => toRelease(row, tracks.get(row.id) ?? [])), total }
}

export function getRelease(id: string): Release | null {
  const row = db.prepare("SELECT * FROM releases WHERE id = ?").get(id) as unknown as
    | ReleaseRow
    | undefined
  if (!row) return null
  return toRelease(row, tracksFor([id]).get(id) ?? [])
}

function replaceTracks(releaseId: string, tracklist: Track[]): void {
  db.prepare("DELETE FROM tracks WHERE release_id = ?").run(releaseId)
  const insert = db.prepare(
    "INSERT INTO tracks (release_id, position, title, duration, sort_order) VALUES (?, ?, ?, ?, ?)",
  )
  tracklist.forEach((track, index) => {
    insert.run(releaseId, track.position, track.title, track.duration, index)
  })
}

export function createRelease(release: Release): Release {
  return transaction(() => {
    db.prepare(
      `INSERT INTO releases (id, artist, title, year, genre, label, format, condition, price, stock, is_new)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
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
    )
    replaceTracks(release.id, release.tracklist)
    return release
  })
}

export function updateRelease(id: string, changes: Partial<Release>): Release | null {
  const current = getRelease(id)
  if (!current) return null

  const next: Release = { ...current, ...changes, id }

  return transaction(() => {
    db.prepare(
      `UPDATE releases
       SET artist = ?, title = ?, year = ?, genre = ?, label = ?, format = ?, condition = ?,
           price = ?, stock = ?, is_new = ?
       WHERE id = ?`,
    ).run(
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
    )
    if (changes.tracklist) replaceTracks(id, changes.tracklist)
    return next
  })
}

export function deleteRelease(id: string): boolean {
  const result = db.prepare("DELETE FROM releases WHERE id = ?").run(id)
  return result.changes > 0
}

export function releaseExists(id: string): boolean {
  return db.prepare("SELECT 1 FROM releases WHERE id = ?").get(id) !== undefined
}

/** Descuenta stock sólo si alcanza; devuelve false cuando no queda suficiente. */
export function decrementStock(id: string, quantity: number): boolean {
  const result = db
    .prepare("UPDATE releases SET stock = stock - ? WHERE id = ? AND stock >= ?")
    .run(quantity, id, quantity)
  return result.changes > 0
}

export function listGenres(): string[] {
  const rows = db
    .prepare("SELECT DISTINCT genre FROM releases ORDER BY genre COLLATE NOCASE")
    .all() as unknown as { genre: string }[]
  return rows.map((row) => row.genre)
}

export function listLabels(): string[] {
  const rows = db
    .prepare("SELECT DISTINCT label FROM releases ORDER BY label COLLATE NOCASE")
    .all() as unknown as { label: string }[]
  return rows.map((row) => row.label)
}

export function countReleases(): number {
  const row = db.prepare("SELECT COUNT(*) AS total FROM releases").get() as unknown as {
    total: number
  }
  return row.total
}
