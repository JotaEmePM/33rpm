import { fromNodeHeaders } from "better-auth/node"
import type { NextFunction, Request, RequestHandler, Response } from "express"
import { auth } from "../auth/auth.js"
import { verifyAccessToken } from "../auth/verify-token.js"

export interface AuthContext {
  userId: string
  email?: string
  role: string
  via: "jwt" | "session"
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) return null
  const token = header.slice("Bearer ".length).trim()
  return token.length > 0 ? token : null
}

/**
 * Resuelve quién llama: primero el JWT del encabezado, y si no viene,
 * la cookie de sesión. Nunca falla; solo deja (o no) `req.auth`.
 */
export const attachAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = bearerToken(req)

    if (token) {
      const claims = await verifyAccessToken(token)
      if (claims) {
        req.auth = { userId: claims.sub, email: claims.email, role: claims.role, via: "jwt" }
        next()
        return
      }
    }

    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
    if (session?.user) {
      req.auth = {
        userId: session.user.id,
        email: session.user.email,
        role: (session.user as { role?: string }).role ?? "customer",
        via: "session",
      }
    }
    next()
  } catch (error) {
    next(error)
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ error: "Necesitas iniciar sesión" })
    return
  }
  next()
}

export function requireRole(...roles: string[]): RequestHandler {
  return (req, res, next) => {
    if (!req.auth) {
      res.status(401).json({ error: "Necesitas iniciar sesión" })
      return
    }
    if (!roles.includes(req.auth.role)) {
      // 403 y no 404: quien llama ya está identificado, solo no tiene permiso.
      res.status(403).json({ error: "No tienes permiso para esta operación" })
      return
    }
    next()
  }
}

export const requireAdmin: RequestHandler = requireRole("admin")
