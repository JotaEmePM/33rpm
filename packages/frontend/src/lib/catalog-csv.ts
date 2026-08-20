import type { Release } from "../types"
import { parseCsv, toCsv } from "./csv"

/**
 * Traducción entre el catálogo y el archivo que edita la tienda.
 * Las cabeceras van en español porque el archivo se abre en una hoja de cálculo;
 * el API sigue hablando su propio modelo.
 */
const COLUMNS = [
  { header: "id", field: "id", type: "text" },
  { header: "artista", field: "artist", type: "text" },
  { header: "titulo", field: "title", type: "text" },
  { header: "anio", field: "year", type: "entero" },
  { header: "genero", field: "genre", type: "text" },
  { header: "sello", field: "label", type: "text" },
  { header: "formato", field: "format", type: "text" },
  { header: "estado", field: "condition", type: "text" },
  { header: "precio", field: "price", type: "entero" },
  { header: "stock", field: "stock", type: "entero" },
  { header: "novedad", field: "isNew", type: "siNo" },
  { header: "preventa", field: "isPreorder", type: "siNo" },
  { header: "destacado", field: "isFeatured", type: "siNo" },
  { header: "visible", field: "visible", type: "siNo" },
  { header: "lastfm", field: "lastfmUrl", type: "text" },
] as const

export const CATALOG_CSV_HEADERS = COLUMNS.map((column) => column.header)

export interface ImportRow {
  line: number
  [field: string]: unknown
}

export interface ParsedCatalogCsv {
  rows: ImportRow[]
  issues: string[]
}

/**
 * El API valida con los nombres de su modelo; en el archivo las columnas están
 * en español. Sin esta traducción el error diría "title" sobre una columna
 * llamada "titulo".
 */
export function translateIssue(issue: string): string {
  return COLUMNS.reduce(
    (message, column) => message.replace(new RegExp(`\\b${column.field}\\b`, "g"), column.header),
    issue,
  )
}

/** Sin acentos, en minúsculas y sin espacios: así "Género" y "genero" son la misma columna. */
function normalize(header: string): string {
  return header
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
}

export function releasesToCsv(releases: Release[]): string {
  const rows = releases.map((release) =>
    COLUMNS.map((column) => {
      if (column.type === "siNo") return release[column.field as keyof Release] ? "si" : "no"
      return String(release[column.field as keyof Release] ?? "")
    }),
  )
  return toCsv([...CATALOG_CSV_HEADERS], rows)
}

/**
 * Convierte el archivo en filas listas para el API. Sólo comprueba lo que se
 * puede saber sin la base —números y sí/no—; de lo demás responde el API, que
 * es quien manda.
 */
export function parseCatalogCsv(text: string): ParsedCatalogCsv {
  const table = parseCsv(text)
  if (table.length === 0) return { rows: [], issues: ["El archivo está vacío"] }

  const headers = table[0].map(normalize)
  const known = headers.filter((header) => COLUMNS.some((column) => column.header === header))
  if (known.length === 0) {
    return {
      rows: [],
      issues: [`La primera línea debe traer las columnas: ${CATALOG_CSV_HEADERS.join(", ")}`],
    }
  }

  const issues: string[] = []
  const rows: ImportRow[] = []

  table.slice(1).forEach((cells, index) => {
    // La cabecera es la línea 1 y el archivo se lee tal cual lo ve la hoja de cálculo.
    const line = index + 2
    const row: ImportRow = { line }

    headers.forEach((header, position) => {
      const column = COLUMNS.find((candidate) => candidate.header === header)
      const raw = cells[position]?.trim() ?? ""
      // Celda vacía es "no lo toques": sólo el id vacío significa algo, un alta.
      if (!column || (raw === "" && column.field !== "id")) return

      if (column.type === "entero") {
        // Las planillas guardan los precios como "$27.990": se tolera el adorno,
        // pero cualquier otra cosa es un error y no un cero silencioso.
        const cleaned = raw.replace(/[\s$.]/g, "")
        if (!/^-?\d+$/.test(cleaned)) {
          issues.push(`Fila ${line}: ${column.header} debe ser un número entero`)
          return
        }
        row[column.field] = Number(cleaned)
        return
      }

      if (column.type === "siNo") {
        const value = normalize(raw)
        if (!["si", "no", "1", "0", "true", "false"].includes(value)) {
          issues.push(`Fila ${line}: novedad debe ser "si" o "no"`)
          return
        }
        row[column.field] = ["si", "1", "true"].includes(value)
        return
      }

      row[column.field] = raw
    })

    rows.push(row)
  })

  if (rows.length === 0) issues.push("El archivo no trae ninguna fila de datos")
  return { rows, issues }
}
