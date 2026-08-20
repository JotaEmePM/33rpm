/**
 * CSV a mano, sin librería: el catálogo cabe en un archivo plano y lo único
 * delicado son las comillas y los separadores que mete cada hoja de cálculo.
 */

/** Excel no reconoce el UTF-8 sin esta marca y destroza los acentos. */
const BOM = "﻿"

const DELIMITERS = [",", ";", "\t"] as const

function escapeCell(value: string): string {
  return /[",\n\r;]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n")
}

/** El separador lo decide la configuración regional de quien guardó el archivo. */
function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.search(/\r?\n/) + 1 || undefined)
  let best = ","
  let bestCount = 0
  for (const candidate of DELIMITERS) {
    const count = firstLine.split(candidate).length - 1
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

/**
 * Devuelve las filas no vacías. Entiende comillas dobles, comillas escapadas
 * duplicándolas y saltos de línea dentro de una celda.
 */
export function parseCsv(input: string): string[][] {
  const text = input.startsWith(BOM) ? input.slice(1) : input
  const delimiter = detectDelimiter(text)

  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      row.push(cell.trim())
      cell = ""
    } else if (char === "\n" || char === "\r") {
      // \r\n cuenta como un solo final de línea.
      if (char === "\r" && text[index + 1] === "\n") index += 1
      row.push(cell.trim())
      cell = ""
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
    } else {
      cell += char
    }
  }

  row.push(cell.trim())
  if (row.some((value) => value.length > 0)) rows.push(row)

  return rows
}

/** Entrega el archivo al navegador y suelta la URL temporal en cuanto se usa. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
