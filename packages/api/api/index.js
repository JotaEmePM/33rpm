import { createApp } from "../dist/app.js"

/**
 * Entrada del API en Vercel: una única función que atiende todas las rutas.
 * El `vercel.json` reescribe /api/* y /health hasta aquí, y Express se encarga
 * del resto. El servidor con `listen()` sigue siendo `src/index.ts` en local.
 */
export default createApp()
