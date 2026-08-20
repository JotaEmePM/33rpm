import { type Request, type Response, Router } from "express"
import { logger } from "../lib/logger.js"
import { getPayment, verifyWebhookSignature } from "../lib/mercadopago.js"
import { applyPaymentResult } from "../repositories/orders.js"
import type { PaymentStatus } from "../types.js"

export const paymentsRouter: Router = Router()

/** Traducción de los estados de Mercado Pago a los del pedido. */
const STATUS: Record<string, PaymentStatus> = {
  approved: "aprobado",
  authorized: "pendiente",
  pending: "pendiente",
  in_process: "pendiente",
  in_mediation: "pendiente",
  rejected: "rechazado",
  cancelled: "anulado",
  refunded: "reembolsado",
  charged_back: "reembolsado",
}

function header(req: Request, name: string): string | undefined {
  const value = req.headers[name]
  return Array.isArray(value) ? value[0] : value
}

/**
 * Notificaciones de pago. Mercado Pago las reintenta, así que aquí todo es
 * idempotente y siempre se responde 200 salvo que la firma no cuadre: un error
 * nuestro haría que reintentara cinco veces sin motivo.
 */
paymentsRouter.post("/webhook", async (req: Request, res: Response) => {
  const dataId = String(req.query["data.id"] ?? req.body?.data?.id ?? "")

  const valid = verifyWebhookSignature({
    signature: header(req, "x-signature"),
    requestId: header(req, "x-request-id"),
    dataId,
  })

  if (!valid) {
    logger.warn({ dataId }, "notificación de pago con firma inválida")
    res.status(401).json({ error: "Firma inválida" })
    return
  }

  // Sólo interesan los avisos de pago; el resto se acepta y se ignora.
  const topic = String(req.query.type ?? req.body?.type ?? "")
  if (topic !== "payment" || !dataId) {
    res.sendStatus(200)
    return
  }

  try {
    const payment = await getPayment(dataId)
    const orderId = payment.external_reference
    const status = STATUS[payment.status]

    if (!orderId || !status) {
      logger.warn({ payment }, "pago sin pedido asociado o con estado desconocido")
      res.sendStatus(200)
      return
    }

    const order = await applyPaymentResult(orderId, {
      paymentStatus: status,
      paymentId: String(payment.id),
    })

    logger.info(
      { orderId, status, pedido: order?.status },
      order ? "pago aplicado al pedido" : "el pedido del pago ya no existe",
    )
  } catch (error) {
    // Se responde 200 igualmente: la notificación se puede reconstruir consultando el pago.
    logger.error({ err: error, dataId }, "no se pudo procesar la notificación de pago")
  }

  res.sendStatus(200)
})
