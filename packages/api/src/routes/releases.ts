import { type Request, type Response, Router } from "express"
import { param } from "../lib/http.js"
import { CONDITIONS, FORMATS, slugify, ValidationError, Validator } from "../lib/validation.js"
import { requireAdmin } from "../middleware/require-auth.js"
import { writeRateLimit } from "../middleware/security.js"
import {
  createRelease,
  deleteRelease,
  getRelease,
  listReleases,
  releaseExists,
  updateRelease,
} from "../repositories/releases.js"
import type { Release, ReleaseQuery, Track } from "../types.js"

export const releasesRouter: Router = Router()

const SORTS = ["recientes", "precio-asc", "precio-desc", "artista"] as const

function asList(value: unknown): string[] | undefined {
  if (typeof value === "string" && value.length > 0) return value.split(",").filter(Boolean)
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string")
  return undefined
}

function parseQuery(req: Request): ReleaseQuery {
  const { q, genero, formato, estado, stock, novedad, orden, pagina, limite } = req.query
  const sort = SORTS.find((option) => option === orden) ?? "recientes"

  return {
    search: typeof q === "string" && q.trim() ? q.trim() : undefined,
    genre: typeof genero === "string" && genero ? genero : undefined,
    formats: asList(formato),
    conditions: asList(estado),
    onlyInStock: stock === "1" || stock === "true",
    onlyNew: novedad === "1" || novedad === "true",
    sort,
    page: Math.max(1, Number(pagina) || 1),
    pageSize: Math.min(100, Math.max(1, Number(limite) || 24)),
  }
}

function parseTracklist(value: unknown): Track[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new ValidationError(["tracklist debe ser una lista"])

  return value.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new ValidationError([`tracklist[${index}] debe ser un objeto`])
    }
    const track = entry as Record<string, unknown>
    const validator = new Validator(track)
    const position = validator.string("position", { max: 10 })
    const title = validator.string("title")
    const duration = validator.string("duration", { max: 10 })
    validator.done()
    return { position: position as string, title: title as string, duration: duration as string }
  })
}

function parseReleaseBody(body: Record<string, unknown>, partial: boolean) {
  const validator = new Validator(body)
  const required = !partial

  const draft = {
    artist: validator.string("artist", { required }),
    title: validator.string("title", { required }),
    year: validator.integer("year", { required, min: 1900, max: 2100 }),
    genre: validator.string("genre", { required, max: 60 }),
    label: validator.string("label", { required, max: 80 }),
    format: validator.oneOf("format", FORMATS, { required }),
    condition: validator.oneOf("condition", CONDITIONS, { required }),
    price: validator.integer("price", { required, min: 0 }),
    stock: validator.integer("stock", { required: false, min: 0, max: 10_000 }),
    isNew: body.isNew === undefined ? undefined : validator.boolean("isNew"),
  }
  validator.done()

  const tracklist = body.tracklist === undefined ? undefined : parseTracklist(body.tracklist)
  return { ...draft, tracklist }
}

releasesRouter.get("/", async (req: Request, res: Response) => {
  const query = parseQuery(req)
  const { items, total } = await listReleases(query)
  res.json({
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pages: Math.max(1, Math.ceil(total / query.pageSize)),
  })
})

releasesRouter.get("/:id", async (req: Request, res: Response) => {
  const release = await getRelease(param(req, "id"))
  if (!release) {
    res.status(404).json({ error: "Disco no encontrado" })
    return
  }
  res.json(release)
})

releasesRouter.post("/", writeRateLimit, requireAdmin, async (req: Request, res: Response) => {
  const parsed = parseReleaseBody(req.body ?? {}, false)

  let id = slugify(parsed.artist as string, parsed.title as string)
  if (!id) id = `disco-${Date.now()}`
  if (await releaseExists(id)) id = `${id}-${Date.now().toString(36)}`

  const release: Release = {
    id,
    artist: parsed.artist as string,
    title: parsed.title as string,
    year: parsed.year as number,
    genre: parsed.genre as string,
    label: parsed.label as string,
    format: parsed.format as Release["format"],
    condition: parsed.condition as Release["condition"],
    price: parsed.price as number,
    stock: parsed.stock ?? 0,
    isNew: parsed.isNew ?? false,
    tracklist: parsed.tracklist ?? [],
  }

  res.status(201).json(await createRelease(release))
})

releasesRouter.patch("/:id", writeRateLimit, requireAdmin, async (req: Request, res: Response) => {
  const parsed = parseReleaseBody(req.body ?? {}, true)
  const changes = Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined),
  ) as Partial<Release>

  const updated = await updateRelease(param(req, "id"), changes)
  if (!updated) {
    res.status(404).json({ error: "Disco no encontrado" })
    return
  }
  res.json(updated)
})

releasesRouter.delete("/:id", writeRateLimit, requireAdmin, async (req: Request, res: Response) => {
  if (!(await deleteRelease(param(req, "id")))) {
    res.status(404).json({ error: "Disco no encontrado" })
    return
  }
  res.status(204).end()
})
