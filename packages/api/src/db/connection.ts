import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { type Client, createClient, type InArgs, type ResultSet, type Row } from "@libsql/client"
import { env } from "../config/env.js"

/**
 * Una sola base para todo: catálogo, pedidos y auth.
 * Con TURSO_DATABASE_URL apunta a Turso; sin ella, a un archivo SQLite local.
 */
export const databaseUrl = env.tursoUrl ?? `file:${resolve(process.cwd(), "data/33rpm.db")}`
export const databaseAuthToken = env.tursoUrl ? env.tursoAuthToken : undefined

// Con base local hay que asegurar la carpeta antes de abrir el archivo.
if (databaseUrl.startsWith("file:")) {
  mkdirSync(dirname(databaseUrl.slice("file:".length)), { recursive: true })
}

export const client: Client = createClient({
  url: databaseUrl,
  authToken: databaseAuthToken,
})

/**
 * Lo mínimo que necesitan los repositorios: el cliente y una transacción lo
 * cumplen igual, así que una consulta suelta y otra dentro de transacción
 * comparten el mismo código.
 */
export interface Executor {
  execute(sql: string, args?: InArgs): Promise<ResultSet>
}

function executor(target: {
  execute: (stmt: { sql: string; args: InArgs }) => Promise<ResultSet>
}) {
  return {
    execute: (sql: string, args: InArgs = []) => target.execute({ sql, args }),
  }
}

export const db: Executor = executor(client)

/** Las filas de libsql son array y objeto a la vez: aquí solo interesan los nombres. */
function toObject<T>(row: Row): T {
  return Object.fromEntries(Object.entries(row)) as T
}

export async function all<T>(sql: string, args: InArgs = [], on: Executor = db): Promise<T[]> {
  const result = await on.execute(sql, args)
  return result.rows.map((row) => toObject<T>(row))
}

export async function one<T>(sql: string, args: InArgs = [], on: Executor = db): Promise<T | null> {
  const rows = await all<T>(sql, args, on)
  return rows[0] ?? null
}

/** Devuelve el número de filas afectadas, que es lo único que miran los repositorios. */
export async function run(sql: string, args: InArgs = [], on: Executor = db): Promise<number> {
  const result = await on.execute(sql, args)
  return Number(result.rowsAffected)
}

/** Los enteros de SQLite pueden llegar como bigint; el dominio siempre usa number. */
export function int(value: unknown): number {
  return Number(value ?? 0)
}

/**
 * Transacción explícita: el trabajo recibe el ejecutor y debe pasarlo a cada
 * repositorio que participe. Sin contador de reentrancia, porque ahora nadie
 * abre una transacción sin saberlo.
 */
export async function transaction<T>(work: (tx: Executor) => Promise<T>): Promise<T> {
  const tx = await client.transaction("write")
  try {
    const result = await work(executor(tx))
    await tx.commit()
    return result
  } catch (error) {
    await tx.rollback()
    throw error
  }
}
