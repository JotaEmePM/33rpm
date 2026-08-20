import { type Request, type Response, Router } from "express"
import { fetchAlbumByUrl, isLastfmConfigured } from "../lib/lastfm.js"
import { ValidationError } from "../lib/validation.js"
import { requireAdmin } from "../middleware/require-auth.js"

export const lastfmRouter: Router = Router()

/**
 * Ficha de un álbum a partir de su URL de Last.fm, para rellenar el formulario
 * del panel. La clave se queda en el servidor.
 */
lastfmRouter.get("/album", requireAdmin, async (req: Request, res: Response) => {
  if (!isLastfmConfigured()) {
    res.status(503).json({ error: "Last.fm no está configurado" })
    return
  }

  const url = String(req.query.url ?? "")
  if (!url) throw new ValidationError(["Falta la URL del álbum"])

  const album = await fetchAlbumByUrl(url)
  if (!album) {
    res.status(404).json({ error: "Last.fm no conoce ese álbum" })
    return
  }

  res.json(album)
})
