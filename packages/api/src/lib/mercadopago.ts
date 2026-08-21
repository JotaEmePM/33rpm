import { createHmac, timingSafeEqual } from "node:crypto"
import { env } from "../config/env.js"
import { logger } from "./logger.js"

const API = "https://api.mercadopago.com"

export function isPaymentsConfigured(): boolean {
  return Boolean(env.mercadoPagoToken)
}

interface PreferenceItem {
  id: string
  title: string
  quantity: number
  unit_price: number
}

export interface PreferenceRequest {
  orderId: string
  items: PreferenceItem[]
  payer: { name: string; email: string }
  /** A dónde vuelve el cliente al terminar, con el resultado en la URL. */
  backUrl: string
  notificationUrl: string
}

export interface Preference {
  id: string
  initPoint: string
}

async function callMercadoPago<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const { idempotencyKey, ...options } = init

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.mercadoPagoToken}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
      ...options.headers,
    },
    signal: AbortSignal.timeout(15_000),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    logger.error({ path, status: response.status, payload }, "Mercado Pago rechazó la llamada")
    throw new Error("Mercado Pago no pudo procesar la operación")
  }
  return payload as T
}

/**
 * Mercado Pago no acepta `localhost` como destino de vuelta: con `auto_return`
 * activado responde 400 (`invalid_auto_return`). En desarrollo se omite y el
 * cliente vuelve pulsando el botón del comprobante, que es lo único que cambia.
 */
function isPublicUrl(url: string): boolean {
  const { hostname } = new URL(url)
  return hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "[::1]"
}

/**
 * Crea la preferencia de Checkout Pro. El pedido viaja como `external_reference`
 * para poder reconocerlo cuando llegue la notificación del pago.
 */
export async function createPreference(request: PreferenceRequest): Promise<Preference> {
  const created = await callMercadoPago<{ id: string; init_point: string }>(
    "/checkout/preferences",
    {
      method: "POST",
      idempotencyKey: request.orderId,
      body: JSON.stringify({
        items: request.items.map((item) => ({ ...item, currency_id: "CLP" })),
        payer: { name: request.payer.name, email: request.payer.email },
        external_reference: request.orderId,
        notification_url: request.notificationUrl,
        statement_descriptor: "33RPM",
        back_urls: {
          success: `${request.backUrl}?estado=exito`,
          pending: `${request.backUrl}?estado=pendiente`,
          failure: `${request.backUrl}?estado=fallo`,
        },
        ...(isPublicUrl(request.backUrl) ? { auto_return: "approved" } : {}),
      }),
    },
  )

  return { id: created.id, initPoint: created.init_point }
}

export interface MercadoPagoPayment {
  id: number
  status: string
  status_detail?: string
  external_reference?: string
}

export function getPayment(paymentId: string): Promise<MercadoPagoPayment> {
  return callMercadoPago<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`)
}

/**
 * Comprueba la firma de la notificación: Mercado Pago manda en `x-signature`
 * un timestamp y un HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * hecho con la clave secreta de la aplicación.
 */
export function verifyWebhookSignature({
  signature,
  requestId,
  dataId,
}: {
  signature: string | undefined
  requestId: string | undefined
  dataId: string | undefined
}): boolean {
  // Sin secreto configurado no se puede comprobar nada: se rechaza.
  if (!env.mercadoPagoWebhookSecret || !signature) return false

  const parts = new Map(
    signature.split(",").map((part) => {
      const [key, value] = part.split("=")
      return [key?.trim(), value?.trim()] as const
    }),
  )

  const ts = parts.get("ts")
  const received = parts.get("v1")
  if (!ts || !received) return false

  // Los campos ausentes se omiten del manifiesto, no se mandan vacíos.
  const manifest = [
    dataId ? `id:${dataId};` : "",
    requestId ? `request-id:${requestId};` : "",
    `ts:${ts};`,
  ].join("")

  const expected = createHmac("sha256", env.mercadoPagoWebhookSecret).update(manifest).digest("hex")

  const a = Buffer.from(expected, "hex")
  const b = Buffer.from(received, "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}
