import { betterAuth } from "better-auth"
import { admin, bearer, jwt, magicLink } from "better-auth/plugins"
import { env } from "../config/env.js"
import { logger } from "../lib/logger.js"
import { configureAuthDatabase } from "./database.js"
import { sendMagicLink } from "./magic-link-mailer.js"

export const auth = betterAuth({
  appName: "33rpm",
  secret: env.authSecret,
  baseURL: env.authBaseUrl,
  basePath: "/api/auth",
  database: configureAuthDatabase(),
  trustedOrigins: env.corsOrigins,

  // Sin contraseñas: el único camino de entrada es el enlace mágico.
  emailAndPassword: { enabled: false },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "customer", input: false },
    },
  },

  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: env.isProduction ? "none" : "lax",
      secure: env.isProduction,
    },
  },

  plugins: [
    magicLink({
      expiresIn: 60 * 10,
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLink({ email, url })
      },
    }),
    // Emite el JWT que consume el frontend en Authorization: Bearer.
    jwt({
      jwt: {
        issuer: env.authBaseUrl,
        audience: env.appUrl,
        expirationTime: "15m",
        definePayload: ({ user }) => ({
          sub: user.id,
          email: user.email,
          role: (user as { role?: string }).role ?? "customer",
        }),
      },
    }),
    // Permite mandar el token de sesión como Bearer, además de la cookie.
    bearer(),
    admin({ defaultRole: "customer", adminRoles: ["admin"] }),
  ],

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Los correos de ADMIN_EMAILS entran directamente como administradores.
          const role = env.adminEmails.includes(user.email.toLowerCase()) ? "admin" : "customer"
          if (role === "admin") logger.info({ email: user.email }, "alta de usuario admin")
          return { data: { ...user, role } }
        },
      },
    },
  },
})

export type AuthSession = typeof auth.$Infer.Session
