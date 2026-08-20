import express, { type Request, type Response, Router } from "express"
import { transaction } from "../db/connection.js"
import {
  deleteStoredImages,
  IMAGE_TYPES,
  isBlobConfigured,
  MAX_IMAGE_BYTES,
  storeImage,
} from "../lib/blob.js"
import { param } from "../lib/http.js"
import { fetchAlbumByUrl, isLastfmConfigured } from "../lib/lastfm.js"
import { CONDITIONS, FORMATS, slugify, ValidationError, Validator } from "../lib/validation.js"
import { requireAdmin } from "../middleware/require-auth.js"
import { writeRateLimit } from "../middleware/security.js"
import { addImage, listImages, removeImage, setPrimaryImage } from "../repositories/images.js"
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
    onlyWithoutImages: req.query.sinFoto === "1" && req.auth?.role === "admin",
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
    lastfmUrl: validator.string("lastfmUrl", { required: false, max: 300 }),
  }
  validator.done()

  const tracklist = body.tracklist === undefined ? undefined : parseTracklist(body.tracklist)
  return { ...draft, tracklist }
}

/** Máximo de filas por archivo: pasado eso, el cuerpo no cabe en el límite de express.json. */
const IMPORT_MAX_ROWS = 1000

/** Tope de consultas a Last.fm por subida, para no agotar el tiempo de la función. */
const LASTFM_MAX_LOOKUPS = 40
const LASTFM_BATCH = 4

/**
 * Completa desde Last.fm lo que el archivo no traiga: artista, título y
 * tracklist. Lo que venga escrito en el CSV manda, porque es la decisión de la
 * tienda; Last.fm sólo rellena huecos.
 */
async function fillFromLastfm(rows: ImportRow[]): Promise<string[]> {
  const pending = rows.filter(
    (row) => typeof row.lastfmUrl === "string" && row.lastfmUrl.trim().length > 0,
  )
  if (pending.length === 0) return []
  if (!isLastfmConfigured()) return ["Last.fm no está configurado y el archivo trae fichas"]
  if (pending.length > LASTFM_MAX_LOOKUPS) {
    return [
      `El archivo trae ${pending.length} fichas de Last.fm y el máximo por subida es ${LASTFM_MAX_LOOKUPS}`,
    ]
  }

  const issues: string[] = []

  for (let start = 0; start < pending.length; start += LASTFM_BATCH) {
    await Promise.all(
      pending.slice(start, start + LASTFM_BATCH).map(async (row) => {
        const where = `Fila ${Number(row.line) || "?"}`
        try {
          const album = await fetchAlbumByUrl(String(row.lastfmUrl))
          if (!album) {
            issues.push(`${where}: Last.fm no conoce ese álbum`)
            return
          }
          if (row.artist === undefined) row.artist = album.artist
          if (row.title === undefined) row.title = album.title
          if (row.tracklist === undefined && album.tracklist.length > 0) {
            row.tracklist = album.tracklist
          }
        } catch (error) {
          issues.push(
            `${where}: ${
              error instanceof ValidationError
                ? error.issues.join(", ")
                : "no se pudo consultar Last.fm"
            }`,
          )
        }
      }),
    )
  }

  return issues
}

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

  // Antes de validar: lo que Last.fm pueda aportar cuenta como dato del archivo.
  const lastfmIssues = await fillFromLastfm(rows as ImportRow[])
  if (lastfmIssues.length > 0) throw new ValidationError(lastfmIssues)

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

  // Se recogen aquí y se borran del store al terminar, ya con la base consistente.
  const orphans: string[] = []

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
      const images = await deleteRelease(deletion.id, tx)
      if (!images) {
        gone.push(`${deletion.where}: el disco "${deletion.id}" no existe en el catálogo`)
        continue
      }
      orphans.push(...images.map((image) => image.url))
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

  await deleteStoredImages(orphans)
  res.json(result)
})

/** El cuerpo llega como binario: una imagen no es JSON ni cabe en un formulario. */
const imageBody = express.raw({ type: [...IMAGE_TYPES], limit: MAX_IMAGE_BYTES })

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
}

/** Sube una foto al store y la deja colgada del disco. La primera queda de portada. */
releasesRouter.post(
  "/:id/imagenes",
  writeRateLimit,
  requireAdmin,
  imageBody,
  async (req: Request, res: Response) => {
    if (!isBlobConfigured()) {
      res.status(503).json({ error: "El almacenamiento de imágenes no está configurado" })
      return
    }

    const id = param(req, "id")
    if (!(await releaseExists(id))) {
      res.status(404).json({ error: "Disco no encontrado" })
      return
    }

    const contentType = (req.headers["content-type"] ?? "").split(";")[0].trim()
    const extension = EXTENSIONS[contentType]
    if (!extension) {
      throw new ValidationError([`El formato ${contentType || "desconocido"} no está permitido`])
    }

    const body = req.body
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw new ValidationError(["No llegó ninguna imagen"])
    }

    const name = slugify(String(req.query.nombre ?? "").replace(/\.[a-z0-9]+$/i, "")) || "foto"
    const stored = await storeImage(`discos/${id}/${name}.${extension}`, body, contentType)

    res.status(201).json(await addImage(id, stored))
  },
)

releasesRouter.get("/:id/imagenes", requireAdmin, async (req: Request, res: Response) => {
  res.json({ items: await listImages(param(req, "id")) })
})

/** Cambia la portada: la que se ve en el catálogo y en el buscador. */
releasesRouter.put(
  "/:id/imagenes/:imagenId/principal",
  writeRateLimit,
  requireAdmin,
  async (req: Request, res: Response) => {
    const id = param(req, "id")
    if (!(await setPrimaryImage(id, param(req, "imagenId")))) {
      res.status(404).json({ error: "Imagen no encontrada" })
      return
    }
    res.json({ items: await listImages(id) })
  },
)

releasesRouter.delete(
  "/:id/imagenes/:imagenId",
  writeRateLimit,
  requireAdmin,
  async (req: Request, res: Response) => {
    const id = param(req, "id")
    const removed = await removeImage(id, param(req, "imagenId"))
    if (!removed) {
      res.status(404).json({ error: "Imagen no encontrada" })
      return
    }

    await deleteStoredImages([removed.url])
    res.json({ items: await listImages(id) })
  },
)

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
    lastfmUrl: parsed.lastfmUrl ?? null,
    images: [],
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
  const images = await deleteRelease(param(req, "id"))
  if (!images) {
    res.status(404).json({ error: "Disco no encontrado" })
    return
  }

  // Fuera de la transacción: la base ya está limpia y un huérfano en Blob no la corrompe.
  await deleteStoredImages(images.map((image) => image.url))
  res.status(204).end()
})
