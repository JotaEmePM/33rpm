import { LibsqlDialect } from "@libsql/kysely-libsql"
import { env } from "../config/env.js"
import { databaseAuthToken, databaseUrl } from "../db/connection.js"
import { logger } from "../lib/logger.js"

/**
 * La auth comparte base y conexión con el catálogo: Turso cuando hay
 * TURSO_DATABASE_URL, y el archivo SQLite local cuando no la hay.
 */
export function configureAuthDatabase() {
  logger.info(
    env.tursoUrl ? "auth: usando Turso" : "auth: usando SQLite local (sin TURSO_DATABASE_URL)",
  )

  // Conexión propia y no el cliente compartido: better-auth trae su propia
  // versión de @libsql/client dentro del adaptador de Kysely.
  return {
    dialect: new LibsqlDialect({ url: databaseUrl, authToken: databaseAuthToken }),
    type: "sqlite" as const,
  }
}
