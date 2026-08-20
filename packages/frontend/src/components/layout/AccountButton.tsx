import { Link, useNavigate } from "react-router"
import { clearAccessToken } from "../../lib/access-token"
import { isAdmin, type SessionUser, signOut, useSession } from "../../lib/auth-client"

export function AccountButton() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()

  if (isPending) {
    return <span className="label px-3 text-muted">…</span>
  }

  if (!session) {
    return (
      <Link
        to="/login"
        viewTransition
        className="label flex min-h-11 items-center px-3 text-paper transition-colors hover:text-volt"
      >
        Entrar
      </Link>
    )
  }

  const user = session.user as SessionUser

  async function handleSignOut() {
    await signOut()
    clearAccessToken()
    navigate("/", { viewTransition: true })
  }

  return (
    <div className="flex items-center gap-2">
      {isAdmin(user) ? (
        <Link
          to="/admin/productos"
          viewTransition
          className="label flex min-h-11 items-center px-3 text-volt transition-colors hover:text-paper"
        >
          Admin
        </Link>
      ) : null}
      <button
        type="button"
        onClick={handleSignOut}
        title={user.email}
        className="label min-h-11 px-3 text-muted transition-colors hover:text-volt"
      >
        Salir
      </button>
    </div>
  )
}
