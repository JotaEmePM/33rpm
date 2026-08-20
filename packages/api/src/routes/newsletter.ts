import { type Request, type Response, Router } from "express"
import { Validator } from "../lib/validation.js"
import { writeRateLimit } from "../middleware/security.js"
import { subscribe } from "../repositories/subscribers.js"

export const newsletterRouter: Router = Router()

newsletterRouter.post("/", writeRateLimit, (req: Request, res: Response) => {
  const validator = new Validator((req.body ?? {}) as Record<string, unknown>)
  const email = validator.email("email")
  validator.done()

  subscribe(email as string)
  res.status(201).json({ subscribed: true, email })
})
