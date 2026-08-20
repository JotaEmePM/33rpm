import { env } from "../config/env.js"
import { logger } from "../lib/logger.js"

interface MagicLinkMail {
  email: string
  url: string
}

/**
 * Entrega del enlace mágico.
 *
 * En desarrollo se imprime en el log: basta para entrar y no obliga a montar SMTP.
 * En producción hay que enchufar aquí el proveedor real (SES, Resend, SMTP…);
 * mientras no exista, falla en vez de fingir que envió el correo.
 */
export async function sendMagicLink({ email, url }: MagicLinkMail): Promise<void> {
  if (!env.isProduction) {
    logger.info({ email, url }, "enlace de acceso (solo desarrollo)")
    return
  }

  logger.error({ email }, "no hay proveedor de correo configurado para el enlace mágico")
  throw new Error("Envío de correo no configurado")
}
