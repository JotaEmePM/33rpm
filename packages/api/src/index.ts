import { env } from "./config/env.js"
import { createApp } from "./create-app.js"
import { bootstrapDatabase } from "./db/bootstrap.js"

const port = Number(process.env.PORT ?? 3000)

// En local la base se crea y se siembra al arrancar. En producción el esquema
// ya está en Turso (`pnpm db:push`) y no se toca en cada arranque en frío.
if (!env.isProduction) {
  await bootstrapDatabase()
}

// Vercel toma este servidor por su llamada a listen(); en local es el de siempre.
createApp().listen(port, () => {
  console.log(`api escuchando en http://localhost:${port}`)
})
