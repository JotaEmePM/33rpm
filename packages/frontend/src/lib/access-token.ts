import { API_BASE_URL } from "./auth-client"

interface CachedToken {
  token: string
  /** Momento (ms) en que conviene renovarlo, con margen sobre el `exp` real. */
  renewAt: number
}

let cached: CachedToken | null = null
let inFlight: Promise<string | null> | null = null

function expiryFromJwt(token: string): number {
  try {
    const [, payload] = token.split(".")
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number
    }
    // 30 s de margen para no mandar un token que caduca en pleno vuelo.
    return decoded.exp ? decoded.exp * 1000 - 30_000 : Date.now() + 60_000
  } catch {
    return Date.now() + 60_000
  }
}

/**
 * JWT de acceso de la sesión actual. La cookie httpOnly es la fuente de verdad;
 * el token es de corta vida y se pide de nuevo cuando caduca.
 */
export async function getAccessToken(): Promise<string | null> {
  if (cached && cached.renewAt > Date.now()) return cached.token
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
        credentials: "include",
      })
      if (!response.ok) {
        cached = null
        return null
      }
      const payload = (await response.json()) as { token?: string }
      if (!payload.token) {
        cached = null
        return null
      }
      cached = { token: payload.token, renewAt: expiryFromJwt(payload.token) }
      return cached.token
    } catch {
      cached = null
      return null
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

/** Tras cerrar sesión, o cuando el API rechaza el token. */
export function clearAccessToken(): void {
  cached = null
}
