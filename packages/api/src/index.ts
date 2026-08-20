import { createApp } from "./app.js"
import { bootstrapDatabase } from "./db/bootstrap.js"

const port = Number(process.env.PORT ?? 3000)

// En local la base se crea y se siembra al arrancar; en Turso eso ya lo hizo `pnpm db:push`.
await bootstrapDatabase()

createApp().listen(port, () => {
  console.log(`api listening on http://localhost:${port}`)
})
