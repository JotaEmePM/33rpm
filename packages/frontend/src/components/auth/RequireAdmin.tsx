import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { isAdmin, type SessionUser, useSession } from "../../lib/auth-client"
import { LoadingState } from "../ui/StateMessage"

/**
 * Guarda de conveniencia para la interfaz: evita mostrar pantallas inútiles.
 * La autorización de verdad la hace el API, que rechaza sin rol admin.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()
  const location = useLocation()

  if (isPending) {
    return (
      <div className="px-4 py-10 sm:px-6">
        <LoadingState label="Comprobando sesión" />
      </div>
    )
  }

  if (!session) {
    const destination = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?destino=${destination}`} replace />
  }

  if (!isAdmin(session.user as SessionUser)) {
    return (
      <section className="flex flex-col items-start gap-4 px-4 py-20 sm:px-6">
        <p className="label text-volt">Acceso restringido</p>
        <h1 className="font-display text-5xl uppercase leading-[0.9]">
          Esta zona
          <br />
          es del equipo
        </h1>
        <p className="text-muted">
          Tu cuenta ({session.user.email}) no tiene permisos de administración.
        </p>
      </section>
    )
  }

  return <>{children}</>
}
