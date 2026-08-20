import type { NextFunction, Request, Response } from "express"
import { ValidationError } from "../lib/validation.js"
import { OrderError } from "../repositories/orders.js"
import { CorsError } from "./security.js"

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "Ruta no encontrada" })
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ValidationError) {
    res.status(422).json({ error: error.message, issues: error.issues })
    return
  }

  if (error instanceof CorsError) {
    res.status(error.status).json({ error: error.message })
    return
  }

  // body-parser corta la subida cuando la imagen pasa del límite.
  if ((error as { type?: string })?.type === "entity.too.large") {
    res.status(413).json({ error: "La imagen supera el tamaño permitido" })
    return
  }

  if (error instanceof OrderError) {
    res.status(error.status).json({ error: error.message, details: error.details })
    return
  }

  console.error(error)
  res.status(500).json({ error: "Error interno del servidor" })
}
