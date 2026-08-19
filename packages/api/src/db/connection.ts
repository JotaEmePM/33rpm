import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"

const DB_PATH = process.env.DATABASE_PATH ?? resolve(process.cwd(), "data/33rpm.db")

mkdirSync(dirname(DB_PATH), { recursive: true })

export const db = new DatabaseSync(DB_PATH)

db.exec("PRAGMA journal_mode = WAL")
db.exec("PRAGMA foreign_keys = ON")

let depth = 0

/** Transacción reentrante: sólo la llamada más externa abre y cierra. */
export function transaction<T>(work: () => T): T {
  if (depth > 0) {
    depth += 1
    try {
      return work()
    } finally {
      depth -= 1
    }
  }

  db.exec("BEGIN")
  depth = 1
  try {
    const result = work()
    db.exec("COMMIT")
    return result
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  } finally {
    depth = 0
  }
}
