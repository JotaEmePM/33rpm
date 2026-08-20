import { magicLinkClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

/** En dev, Vite hace proxy de /api al backend; en producción se apunta con VITE_API_URL. */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? window.location.origin

export const authClient = createAuthClient({
  baseURL: `${API_BASE_URL}/api/auth`,
  fetchOptions: { credentials: "include" },
  plugins: [magicLinkClient()],
})

export const { useSession, signOut } = authClient

export interface SessionUser {
  id: string
  email: string
  name?: string
  role?: string
}

/** Pide el enlace mágico; el correo vuelve apuntando al frontend. */
export function requestMagicLink(email: string, callbackURL: string) {
  return authClient.signIn.magicLink({ email, callbackURL })
}

export function isAdmin(user: SessionUser | null | undefined): boolean {
  return user?.role === "admin"
}
