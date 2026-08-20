import { useRouteError } from "react-router"
import { ApiError } from "../api/client"
import { NotFoundPage } from "../pages/NotFoundPage"
import { ErrorState } from "./ui/StateMessage"

export function RouteError() {
  const error = useRouteError()

  if (error instanceof ApiError && error.status === 404) {
    return <NotFoundPage />
  }

  const message =
    error instanceof Error
      ? error.message
      : "No pudimos cargar esta página. ¿Está corriendo la API?"

  return (
    <section className="px-4 py-10 sm:px-6">
      <ErrorState message={message} onRetry={() => window.location.reload()} />
    </section>
  )
}
