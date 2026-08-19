import { db } from "../db/connection.js"

/** Alta idempotente: repetir el correo no falla ni duplica. */
export function subscribe(email: string): void {
  db.prepare("INSERT OR IGNORE INTO subscribers (email) VALUES (?)").run(email.toLowerCase())
}

export function countSubscribers(): number {
  const row = db.prepare("SELECT COUNT(*) AS total FROM subscribers").get() as unknown as {
    total: number
  }
  return row.total
}
