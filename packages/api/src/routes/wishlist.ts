import { type Request, type Response, Router } from "express"
import { param } from "../lib/http.js"
import { requireAuth } from "../middleware/require-auth.js"
import { writeRateLimit } from "../middleware/security.js"
import { releaseExists } from "../repositories/releases.js"
import {
  addToWishlist,
  listWishlist,
  listWishlistIds,
  removeFromWishlist,
} from "../repositories/wishlist.js"

export const wishlistRouter: Router = Router()

/** Toda la lista es personal: sin sesión no hay nada que ver. */
wishlistRouter.use(requireAuth)

function userId(req: Request): string {
  // requireAuth ya garantizó que hay sesión.
  return (req.auth as { userId: string }).userId
}

wishlistRouter.get("/", async (req: Request, res: Response) => {
  res.json({ items: await listWishlist(userId(req)) })
})

/** Sólo los ids: es lo que necesita el catálogo para pintar los corazones. */
wishlistRouter.get("/ids", async (req: Request, res: Response) => {
  res.json({ ids: await listWishlistIds(userId(req)) })
})

wishlistRouter.put("/:releaseId", writeRateLimit, async (req: Request, res: Response) => {
  const releaseId = param(req, "releaseId")
  if (!(await releaseExists(releaseId))) {
    res.status(404).json({ error: "Disco no encontrado" })
    return
  }

  await addToWishlist(userId(req), releaseId)
  res.status(201).json({ ids: await listWishlistIds(userId(req)) })
})

wishlistRouter.delete("/:releaseId", writeRateLimit, async (req: Request, res: Response) => {
  await removeFromWishlist(userId(req), param(req, "releaseId"))
  res.json({ ids: await listWishlistIds(userId(req)) })
})
