import { type Request, type Response, Router } from "express"
import { CONDITIONS, FORMATS } from "../lib/validation.js"
import { SHIPPING_FLAT_CLP } from "../repositories/orders.js"
import { listGenres, listLabels } from "../repositories/releases.js"

export const metaRouter: Router = Router()

/** Todo lo que el frontend necesita para dibujar filtros y formularios. */
metaRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    genres: listGenres(),
    labels: listLabels(),
    formats: FORMATS,
    conditions: CONDITIONS,
    shippingFlatClp: SHIPPING_FLAT_CLP,
    currency: "CLP",
  })
})
