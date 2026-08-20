import cors, { type CorsOptions } from "cors"
import type { RequestHandler } from "express"
import rateLimit, { ipKeyGenerator } from "express-rate-limit"
import helmet from "helmet"
import { env } from "../config/env.js"
import { logger } from "../lib/logger.js"

/** Origen fuera de la lista blanca: es un 403, no un fallo del servidor. */
export class CorsError extends Error {
  readonly status = 403

  constructor(readonly origin: string) {
    super("Origen no autorizado")
    this.name = "CorsError"
  }
}

/** Cabeceras de seguridad. Este servicio solo devuelve JSON: nada de scripts ni marcos. */
export const securityHeaders: RequestHandler = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "same-site" },
  referrerPolicy: { policy: "no-referrer" },
  hsts: env.isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
})

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Sin cabecera Origin (curl, health checks, servidor a servidor) se deja pasar.
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    logger.warn({ origin }, "origen bloqueado por CORS")
    callback(new CorsError(origin))
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
  exposedHeaders: ["x-request-id"],
  maxAge: 86400,
}

export const corsMiddleware = cors(corsOptions)

/** Cuenta por IP; si hay sesión, por usuario, para no castigar a toda una oficina tras un NAT. */
function keyByUserOrIp(req: Parameters<RequestHandler>[0]): string {
  const userId = (req as { auth?: { userId?: string } }).auth?.userId
  return userId ?? ipKeyGenerator(req.ip ?? "")
}

function onLimitReached(req: Parameters<RequestHandler>[0]): void {
  logger.warn({ ip: req.ip, url: req.originalUrl }, "límite de peticiones alcanzado")
}

/** Techo general del API. */
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  handler: (req, res) => {
    onLimitReached(req)
    res.status(429).json({ error: "Demasiadas peticiones. Prueba en unos minutos." })
  },
})

/** Login y enlaces mágicos: mucho más estrecho, siempre por IP. */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  handler: (req, res) => {
    onLimitReached(req)
    res.status(429).json({ error: "Demasiados intentos de acceso. Espera unos minutos." })
  },
})

/** Escrituras del catálogo y creación de pedidos. */
export const writeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  handler: (req, res) => {
    onLimitReached(req)
    res.status(429).json({ error: "Demasiadas operaciones seguidas. Espera un momento." })
  },
})
