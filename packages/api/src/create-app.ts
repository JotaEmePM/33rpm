import { toNodeHandler } from "better-auth/node"
import express, { type Express, type Request, type Response } from "express"
import { auth } from "./auth/auth.js"
import { env } from "./config/env.js"
import { isBlobConfigured } from "./lib/blob.js"
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
import { paymentsRouter } from "./routes/payments.js"
import { releasesRouter } from "./routes/releases.js"
import { wishlistRouter } from "./routes/wishlist.js"

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
    // `storage` evita tener que iniciar sesión sólo para saber si el store de
    // imágenes quedó bien enchufado tras un despliegue.
    res.json({
      status: "ok",
      uptime: process.uptime(),
      storage: isBlobConfigured() ? "ok" : "sin configurar",
    })
  })

  app.use("/api/releases", releasesRouter)
  app.use("/api/orders", ordersRouter)
  app.use("/api/pagos", paymentsRouter)
  app.use("/api/meta", metaRouter)
  app.use("/api/newsletter", newsletterRouter)
  app.use("/api/lista-deseos", wishlistRouter)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
