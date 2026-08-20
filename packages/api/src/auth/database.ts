import { LibsqlDialect } from "@libsql/kysely-libsql"
import { env } from "../config/env.js"
import { db as localDb } from "../db/connection.js"
import { logger } from "../lib/logger.js"

/**
 * Con TURSO_DATABASE_URL la auth vive en Turso; sin ella, en el mismo SQLite
 * local del catálogo. Así el login funciona en desarrollo sin credenciales.
 */
export function configureAuthDatabase() {
  if (!env.tursoUrl) {
    logger.info("auth: usando SQLite local (define TURSO_DATABASE_URL para usar Turso)")
    return localDb
  }

  logger.info("auth: usando Turso")
  return {
    dialect: new LibsqlDialect({ url: env.tursoUrl, authToken: env.tursoAuthToken }),
    type: "sqlite" as const,
  }
}
