import cors from "cors"
import express, { type Express, type Request, type Response } from "express"
import { migrate } from "./db/schema.js"
import { seed } from "./db/seed.js"
import { errorHandler, notFound } from "./middleware/errors.js"
import { metaRouter } from "./routes/meta.js"
import { newsletterRouter } from "./routes/newsletter.js"
import { ordersRouter } from "./routes/orders.js"
import { releasesRouter } from "./routes/releases.js"

export function createApp(): Express {
  migrate()
  seed()

  const app = express()

  app.use(cors())
  app.use(express.json())

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", uptime: process.uptime() })
  })

  app.use("/api/releases", releasesRouter)
  app.use("/api/orders", ordersRouter)
  app.use("/api/meta", metaRouter)
  app.use("/api/newsletter", newsletterRouter)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
