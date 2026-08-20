import { env } from "../config/env.js"
import { logger } from "../lib/logger.js"
import { renderMagicLinkEmail } from "./magic-link-email.js"

interface MagicLinkMail {
  email: string
  url: string
}

const RESEND_ENDPOINT = "https://api.resend.com/emails"

/**
 * Entrega del enlace mágico por Resend.
 *
 * Sin RESEND_API_KEY el enlace se imprime en el log: así el desarrollo sigue sin
 * necesitar credenciales. En producción, sin clave, falla en vez de fingir que
 * envió el correo.
 */
export async function sendMagicLink({ email, url }: MagicLinkMail): Promise<void> {
  if (!env.resendApiKey) {
    if (!env.isProduction) {
      logger.info({ email, url }, "enlace de acceso (solo desarrollo)")
      return
    }
    logger.error({ email }, "falta RESEND_API_KEY: no se puede enviar el enlace mágico")
    throw new Error("Envío de correo no configurado")
  }

  const { subject, html, text } = renderMagicLinkEmail(url)

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.mailFrom, to: [email], subject, html, text }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    // El cuerpo trae el motivo (destinatario no permitido, remitente sin verificar…).
    const detail = await response.text().catch(() => "")
    logger.error({ email, status: response.status, detail }, "Resend rechazó el envío")
    throw new Error("No se pudo enviar el enlace de acceso")
  }

  logger.info({ email }, "enlace de acceso enviado")
}
