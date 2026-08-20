import { createRemoteJWKSet, jwtVerify } from "jose"
import { env } from "../config/env.js"

/**
 * Claves públicas publicadas por better-auth en /api/auth/jwks.
 * `jose` las cachea y solo las vuelve a pedir cuando aparece un `kid` desconocido,
 * así que esto sigue valiendo si mañana el API y el emisor se separan.
 */
const jwks = createRemoteJWKSet(new URL(env.jwksUrl ?? "/api/auth/jwks", env.authBaseUrl), {
  cacheMaxAge: 10 * 60 * 1000,
  cooldownDuration: 30 * 1000,
})

export interface TokenClaims {
  sub: string
  email?: string
  role: string
}

/** Devuelve las claims si la firma, el emisor, la audiencia y la expiración cuadran. */
export async function verifyAccessToken(token: string): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.authBaseUrl,
      audience: env.appUrl,
    })

    if (!payload.sub) return null

    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      role: typeof payload.role === "string" ? payload.role : "customer",
    }
  } catch {
    // Token expirado, firma inválida o emisor equivocado: para el API es lo mismo.
    return null
  }
}
