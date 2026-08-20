import { type Request, type Response, Router } from "express"
import { transaction } from "../db/connection.js"
import { param } from "../lib/http.js"
import { CONDITIONS, FORMATS, slugify, ValidationError, Validator } from "../lib/validation.js"
import { requireAdmin } from "../middleware/require-auth.js"
import { writeRateLimit } from "../middleware/security.js"
import {
  createRelease,
  deleteRelease,
  getRelease,
  hideMissing,
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
  const { q, genero, formato, estado, stock, novedad, preventa, destacado, orden, pagina, limite } =
    req.query
  const sort = SORTS.find((option) => option === orden) ?? "recientes"

  return {
    search: typeof q === "string" && q.trim() ? q.trim() : undefined,
    genre: typeof genero === "string" && genero ? genero : undefined,
    formats: asList(formato),
    conditions: asList(estado),
    onlyInStock: stock === "1" || stock === "true",
    onlyNew: novedad === "1" || novedad === "true",
    onlyPreorder: preventa === "1" || preventa === "true",
    onlyFeatured: destacado === "1" || destacado === "true",
    sort,
    page: Math.max(1, Number(pagina) || 1),
    pageSize: Math.min(100, Math.max(1, Number(limite) || 24)),
    includeHidden: req.query.ocultos === "1" && req.auth?.role === "admin",
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
    isPreorder: body.isPreorder === undefined ? undefined : validator.boolean("isPreorder"),
    isFeatured: body.isFeatured === undefined ? undefined : validator.boolean("isFeatured"),
    visible: body.visible === undefined ? undefined : validator.boolean("visible"),
  }
  validator.done()

  const tracklist = body.tracklist === undefined ? undefined : parseTracklist(body.tracklist)
  return { ...draft, tracklist }
}

/** Máximo de filas por archivo: pasado eso, el cuerpo no cabe en el límite de express.json. */
const IMPORT_MAX_ROWS = 1000

interface ImportRow extends Record<string, unknown> {
  /** Línea del CSV, sólo para que los errores se puedan localizar en el archivo. */
  line?: unknown
}

/**
 * Importación en bloque desde el CSV del panel de administración.
 *
 * Es todo o nada: basta una fila mala para que no se aplique ninguna, así el
 * catálogo nunca queda a medio actualizar. Con `sincronizar` el archivo se toma
 * como la foto completa de la tienda y lo que no aparezca deja de mostrarse;
 * sin él, una subida parcial sólo toca las filas que trae.
 *
 * En la columna de stock, -1 oculta el disco y -2 lo elimina.
 */
releasesRouter.post("/importar", writeRateLimit, requireAdmin, async (req, res) => {
  const rows = req.body?.items
  // Ocultar lo que falta es destructivo: sólo se hace si quien sube el archivo lo pide.
  const sync = req.body?.sincronizar === true
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ValidationError(["El archivo no trae ninguna fila"])
  }
  if (rows.length > IMPORT_MAX_ROWS) {
    throw new ValidationError([`El archivo no puede traer más de ${IMPORT_MAX_ROWS} filas`])
  }

  const issues: string[] = []
  const updates: { id: string; changes: Partial<Release>; where: string }[] = []
  const creations: { draft: Omit<Release, "id">; where: string }[] = []
  const deletions: { id: string; where: string }[] = []
  const seen = new Set<string>()

  rows.forEach((entry: ImportRow, index: number) => {
    // La cabecera ocupa la línea 1: sin número propio, la primera fila es la 2.
    const where = `Fila ${Number(entry?.line) || index + 2}`

    if (typeof entry !== "object" || entry === null) {
      issues.push(`${where}: no es una fila válida`)
      return
    }

    const id = typeof entry.id === "string" ? entry.id.trim() : ""
    const isNewRow = id.length === 0

    // -2 borra el disco del catálogo. Es lo único que no se puede deshacer, así
    // que sólo se admite sobre una fila que ya tenga id.
    if (Number(entry.stock) === -2) {
      if (isNewRow) {
        issues.push(`${where}: para eliminar hace falta el id del disco`)
        return
      }
      if (seen.has(id)) {
        issues.push(`${where}: el id "${id}" está repetido en el archivo`)
        return
      }
      seen.add(id)
      deletions.push({ id, where })
      return
    }

    // -1 en stock es el atajo para ocultar sin tener que tocar la columna visible;
    // el stock real se conserva por si el disco vuelve a la tienda.
    const row = Number(entry.stock) === -1 ? { ...entry, stock: undefined, visible: false } : entry

    try {
      // Alta: se exige todo. Edición: sólo lo que venga en el archivo.
      const parsed = parseReleaseBody(row, !isNewRow)
      const fields = Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => value !== undefined),
      ) as Partial<Release>

      if (isNewRow) {
        creations.push({
          draft: { ...fields, tracklist: fields.tracklist ?? [] } as Release,
          where,
        })
        return
      }

      if (seen.has(id)) {
        issues.push(`${where}: el id "${id}" está repetido en el archivo`)
        return
      }
      seen.add(id)

      if (Object.keys(fields).length === 0) {
        issues.push(`${where}: no trae ningún dato que cambiar`)
        return
      }
      updates.push({ id, changes: fields, where })
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error
      for (const issue of error.issues) issues.push(`${where}: ${issue}`)
    }
  })

  if (issues.length > 0) throw new ValidationError(issues)

  const result = await transaction(async (tx) => {
    const missing: string[] = []

    for (const update of updates) {
      if (!(await updateRelease(update.id, update.changes, tx))) {
        missing.push(`${update.where}: el disco "${update.id}" no existe en el catálogo`)
      }
    }
    // Se comprueba después de intentarlo todo para devolver la lista completa de una vez.
    if (missing.length > 0) throw new ValidationError(missing)

    const gone: string[] = []
    for (const deletion of deletions) {
      if (!(await deleteRelease(deletion.id, tx))) {
        gone.push(`${deletion.where}: el disco "${deletion.id}" no existe en el catálogo`)
      }
    }
    if (gone.length > 0) throw new ValidationError(gone)

    const keep = updates.map((update) => update.id)

    for (const creation of creations) {
      const base = slugify(creation.draft.artist, creation.draft.title) || `disco-${Date.now()}`
      const id = (await releaseExists(base, tx)) ? `${base}-${Date.now().toString(36)}` : base
      await createRelease({ ...creation.draft, id }, tx)
      keep.push(id)
    }

    // Con sincronizar, el archivo es la foto completa: lo que ya no aparece se oculta.
    const hidden = sync ? await hideMissing(keep, tx) : []

    return {
      actualizados: updates.length,
      creados: creations.length,
      eliminados: deletions.length,
      ocultados: hidden.length,
    }
  })

  res.json(result)
})

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
  if (!release || (!release.visible && req.auth?.role !== "admin")) {
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
    isPreorder: parsed.isPreorder ?? false,
    isFeatured: parsed.isFeatured ?? false,
    visible: parsed.visible ?? true,
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
