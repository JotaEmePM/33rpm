import type { Request } from "express"

/** Express 5 tipa los params como string | string[]; aquí siempre queremos el primero. */
export function param(req: Request, name: string): string {
  const value = req.params[name]
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "")
}
