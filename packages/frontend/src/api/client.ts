/** En dev, Vite hace proxy de /api al backend (ver vite.config.ts). */
const BASE_URL = import.meta.env.VITE_API_URL ?? ""

export class ApiError extends Error {
  status: number
  issues?: string[]

  constructor(message: string, status: number, issues?: string[]) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.issues = issues
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    signal,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = payload as { error?: string; issues?: string[] } | null
    throw new ApiError(
      error?.error ?? `La petición falló (${response.status})`,
      response.status,
      error?.issues,
    )
  }

  return payload as T
}
