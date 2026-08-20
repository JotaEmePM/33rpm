import type { AuthContext } from "../middleware/require-auth.js"

declare global {
  namespace Express {
    interface Request {
      /** Lo rellena `attachAuth`: quién llama, si es que se identificó. */
      auth?: AuthContext
    }
  }
}
