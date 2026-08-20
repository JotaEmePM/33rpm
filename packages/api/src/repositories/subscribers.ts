import { type Executor, int, one, run } from "../db/connection.js"

/** Alta idempotente: repetir el correo no falla ni duplica. */
export async function subscribe(email: string, on?: Executor): Promise<void> {
  await run("INSERT OR IGNORE INTO subscribers (email) VALUES (?)", [email.toLowerCase()], on)
}

export async function countSubscribers(on?: Executor): Promise<number> {
  const row = await one<{ total: number }>("SELECT COUNT(*) AS total FROM subscribers", [], on)
  return int(row?.total)
}
