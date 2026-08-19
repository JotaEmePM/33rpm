import { type FormEvent, useState } from "react"
import { ApiError } from "../../api/client"
import { subscribeToNewsletter } from "../../api/meta"

type Status = "idle" | "sending" | "done" | "error"

export function NewsletterBar() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [message, setMessage] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("sending")

    try {
      await subscribeToNewsletter(email)
      setStatus("done")
    } catch (error) {
      setStatus("error")
      setMessage(
        error instanceof ApiError ? error.message : "No pudimos registrar tu correo ahora mismo",
      )
    }
  }

  return (
    <section className="flex flex-wrap items-center justify-between gap-6 bg-volt px-4 py-8 text-ink sm:px-6">
      <div>
        <h2 className="font-display text-3xl uppercase leading-tight">Suscríbete al drop</h2>
        <p className="mt-1 max-w-sm text-sm">
          Un correo el martes con lo que sale a la venta el miércoles.
        </p>
      </div>

      {status === "done" ? (
        <p className="label border-2 border-ink px-4 py-3">Listo, te escribimos el martes</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-stretch gap-0">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@correo.cl"
            aria-label="Correo electrónico"
            className="min-h-12 w-56 border-2 border-ink bg-paper px-3 text-ink placeholder:text-ink/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="label min-h-12 border-2 border-ink bg-ink px-6 text-paper transition-colors hover:bg-transparent hover:text-ink disabled:opacity-50"
          >
            {status === "sending" ? "Enviando…" : "Suscribirme"}
          </button>
          {status === "error" ? (
            <p className="label mt-2 w-full" role="alert">
              {message}
            </p>
          ) : null}
        </form>
      )}
    </section>
  )
}
