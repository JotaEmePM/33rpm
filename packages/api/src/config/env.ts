function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`)
  }
  return value
}

function list(name: string, fallback: string): string[] {
  return (process.env[name] ?? fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

const nodeEnv = process.env.NODE_ENV ?? "development"
const isProduction = nodeEnv === "production"

export const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),

  /** Orígenes autorizados a llamar al API con credenciales. */
  corsOrigins: list(
    "CORS_ORIGINS",
    // Vite salta de puerto cuando el anterior está ocupado.
    "http://localhost:5173,http://localhost:5174,http://localhost:5175",
  ),

  /** URL pública del frontend: destino del enlace mágico ya verificado. */
  appUrl: process.env.APP_URL ?? "http://localhost:5174",

  /** URL pública de este API: better-auth firma los enlaces con ella. */
  authBaseUrl: process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,

  /**
   * De dónde leer las claves públicas del JWT. Por defecto, del propio
   * BETTER_AUTH_URL; se separa cuando el API se sirve tras un proxy y pedirse
   * las claves a sí mismo daría la vuelta larga.
   */
  jwksUrl: process.env.AUTH_JWKS_URL,

  /** En producción el secreto es obligatorio; en dev hay uno de desarrollo. */
  authSecret: isProduction
    ? required("BETTER_AUTH_SECRET")
    : (process.env.BETTER_AUTH_SECRET ?? "desarrollo-inseguro-cambiar-en-produccion"),

  /** Turso: si no hay URL, la auth cae al SQLite local del catálogo. */
  tursoUrl: process.env.TURSO_DATABASE_URL,
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN,

  /** Resend: sin clave el enlace mágico se imprime en el log en vez de enviarse. */
  resendApiKey: process.env.RESEND_API_KEY,

  /** Remitente de los correos. Cambiarlo es todo lo que pide mudarse a un dominio propio. */
  mailFrom: process.env.MAIL_FROM ?? "33rpm <onboarding@resend.dev>",

  /** Mercado Pago: sin token, el checkout deja el pedido pendiente sin cobrar. */
  mercadoPagoToken: process.env.MP_ACCESS_TOKEN,

  /** Clave con la que Mercado Pago firma las notificaciones de pago. */
  mercadoPagoWebhookSecret: process.env.MP_WEBHOOK_SECRET,

  /**
   * A dónde avisa Mercado Pago cuando cambia un pago. Por defecto va por el
   * mismo dominio que la tienda, que es quien hace de proxy del API; se puede
   * apuntar directo al API sin tocar código.
   */
  paymentsNotificationUrl:
    process.env.MP_NOTIFICATION_URL ??
    `${process.env.APP_URL ?? "http://localhost:5174"}/api/pagos/webhook`,

  /** Correos que reciben rol admin la primera vez que entran. */
  adminEmails: list("ADMIN_EMAILS", ""),

  /** Detrás de un proxy (Fly, Render, Nginx) hay que confiar en X-Forwarded-For. */
  trustProxy: process.env.TRUST_PROXY ?? (isProduction ? "1" : "loopback"),
} as const
