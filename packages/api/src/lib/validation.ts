export class ValidationError extends Error {
  constructor(readonly issues: string[]) {
    super("Datos inválidos")
    this.name = "ValidationError"
  }
}

export const FORMATS = ["LP", "2LP", "EP", '7"', "Box"] as const
export const CONDITIONS = ["Nuevo", "Usado"] as const
export const SHIPPING_METHODS = ["retiro", "despacho"] as const
export const ORDER_STATUSES = ["pendiente", "pagado", "enviado", "anulado"] as const

export class Validator {
  private readonly issues: string[] = []

  constructor(private readonly body: Record<string, unknown>) {}

  string(field: string, { required = true, max = 200 } = {}): string | undefined {
    const value = this.body[field]
    if (value === undefined || value === null || value === "") {
      if (required) this.issues.push(`${field} es obligatorio`)
      return undefined
    }
    if (typeof value !== "string") {
      this.issues.push(`${field} debe ser texto`)
      return undefined
    }
    const trimmed = value.trim()
    if (trimmed.length > max) {
      this.issues.push(`${field} supera ${max} caracteres`)
      return undefined
    }
    return trimmed
  }

  integer(field: string, { required = true, min = 0, max = 100_000_000 } = {}): number | undefined {
    const value = this.body[field]
    if (value === undefined || value === null || value === "") {
      if (required) this.issues.push(`${field} es obligatorio`)
      return undefined
    }
    const parsed = typeof value === "number" ? value : Number(value)
    if (!Number.isInteger(parsed)) {
      this.issues.push(`${field} debe ser un número entero`)
      return undefined
    }
    if (parsed < min || parsed > max) {
      this.issues.push(`${field} debe estar entre ${min} y ${max}`)
      return undefined
    }
    return parsed
  }

  boolean(field: string, fallback = false): boolean {
    const value = this.body[field]
    if (value === undefined || value === null) return fallback
    return value === true || value === "true" || value === 1
  }

  oneOf<T extends string>(
    field: string,
    options: readonly T[],
    { required = true } = {},
  ): T | undefined {
    const value = this.string(field, { required })
    if (value === undefined) return undefined
    if (!options.includes(value as T)) {
      this.issues.push(`${field} debe ser uno de: ${options.join(", ")}`)
      return undefined
    }
    return value as T
  }

  email(field: string): string | undefined {
    const value = this.string(field)
    if (value === undefined) return undefined
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      this.issues.push(`${field} no es un correo válido`)
      return undefined
    }
    return value.toLowerCase()
  }

  add(issue: string): void {
    this.issues.push(issue)
  }

  done(): void {
    if (this.issues.length > 0) throw new ValidationError(this.issues)
  }
}

export function slugify(...parts: string[]): string {
  return parts
    .join(" ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}
