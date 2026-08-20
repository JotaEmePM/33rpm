import { type FormEvent, useState } from "react"
import { useSearchParams } from "react-router"
import { Button } from "../components/ui/Button"
import { Field } from "../components/ui/Field"
import { requestMagicLink } from "../lib/auth-client"

type Status = "idle" | "sending" | "sent" | "error"

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>("idle")
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")

  // Tras verificar el enlace, better-auth devuelve al usuario a donde iba.
  const destination = searchParams.get("destino") ?? "/"

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("sending")

    const { error } = await requestMagicLink(email, `${window.location.origin}${destination}`)

    if (error) {
      setStatus("error")
      setMessage(error.message ?? "No pudimos enviar el enlace. Inténtalo de nuevo.")
      return
    }
    setStatus("sent")
  }

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-16 sm:px-6">
      <div>
        <p className="label text-volt">Acceso</p>
        <h1 className="mt-3 font-display text-5xl uppercase leading-[0.9] sm:text-6xl">
          Entra sin
          <br />
          contraseña
        </h1>
        <p className="mt-4 text-muted">
          Te mandamos un enlace de un solo uso. Vale por diez minutos.
        </p>
      </div>

      {status === "sent" ? (
        <div className="flex flex-col gap-3 border-2 border-volt p-6">
          <p className="label text-volt">Enlace enviado</p>
          <p className="text-sm">
            Revisa <strong>{email}</strong> y abre el enlace para entrar. Si no llega, mira la
            carpeta de spam.
          </p>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="label self-start pt-2 text-muted transition-colors hover:text-volt"
          >
            Usar otro correo
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Field
            label="Correo"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
          />

          {status === "error" ? (
            <p className="border-2 border-volt p-4 text-sm text-volt" role="alert">
              {message}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={status === "sending"}>
            {status === "sending" ? "Enviando…" : "Enviarme el enlace"}
          </Button>
        </form>
      )}
    </section>
  )
}
