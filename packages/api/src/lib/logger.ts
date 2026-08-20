import { randomUUID } from "node:crypto"
import pino from "pino"
import { pinoHttp } from "pino-http"
import { env } from "../config/env.js"

export const logger = pino({
  level: env.logLevel,
  // Nunca dejar credenciales ni tokens en el log.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "req.body.email",
      "req.body.token",
    ],
    censor: "[oculto]",
  },
})

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers["x-request-id"]
    const id = typeof existing === "string" ? existing : randomUUID()
    res.setHeader("x-request-id", id)
    return id
  },
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) return "error"
    if (res.statusCode >= 400) return "warn"
    return "info"
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} → ${res.statusCode}`,
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      ip: req.raw.socket?.remoteAddress,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
})
