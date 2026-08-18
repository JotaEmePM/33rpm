import cors from "cors"
import express, { type Request, type Response } from "express"

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.use(cors())
app.use(express.json())

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() })
})

app.get("/api/hello", (_req: Request, res: Response) => {
  res.json({ message: "Hello from api" })
})

app.listen(port, () => {
  console.log(`api listening on http://localhost:${port}`)
})
