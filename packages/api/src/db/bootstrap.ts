import { migrate } from "./schema.js"
import { seed } from "./seed.js"

let ready: Promise<void> | null = null

/**
 * Crea el esquema y siembra el catálogo una sola vez por proceso.
 * En Vercel el esquema ya está aplicado en Turso: allí esto no corre, lo hace
 * `pnpm db:push` desde fuera.
 */
export function bootstrapDatabase(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await migrate()
      await seed()
    })().catch((error) => {
      ready = null
      throw error
    })
  }
  return ready
}
