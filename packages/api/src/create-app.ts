import { toNodeHandler } from "better-auth/node"
import express, { type Express, type Request, type Response } from "express"
import { auth } from "./auth/auth.js"
import { env } from "./config/env.js"
import { httpLogger } from "./lib/logger.js"
import { errorHandler, notFound } from "./middleware/errors.js"
import { attachAuth } from "./middleware/require-auth.js"
import {
  authRateLimit,
  corsMiddleware,
  globalRateLimit,
  securityHeaders,
} from "./middleware/security.js"
import { metaRouter } from "./routes/meta.js"
import { newsletterRouter } from "./routes/newsletter.js"
import { ordersRouter } from "./routes/orders.js"
import { releasesRouter } from "./routes/releases.js"

/**
 * Monta seguridad, auth y rutas sobre la app que reciba. Quien la crea es
 * `index.ts`, que además es el entrypoint que Vercel arranca en producción.
 */
export function configureApp(app: Express): Express {
  // Necesario para que el límite por IP no vea siempre la del proxy.
  app.set("trust proxy", env.trustProxy)
  app.disable("x-powered-by")

  app.use(httpLogger)
  app.use(securityHeaders)
  app.use(corsMiddleware)
  app.use(globalRateLimit)

  // better-auth trae su propio parseo de cuerpo: va montado ANTES de express.json().
  app.all("/api/auth/{*any}", authRateLimit, toNodeHandler(auth))

  app.use(express.json({ limit: "100kb" }))
  app.use(attachAuth)

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
