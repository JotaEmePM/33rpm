import { clearAccessToken, getAccessToken } from "../lib/access-token"

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
  /** Las rutas protegidas viajan con el JWT de la sesión. */
  auth?: boolean
  /** Fuerza el tipo del cuerpo: las imágenes se mandan en crudo, no como JSON. */
  contentType?: string
}

async function send(path: string, options: RequestOptions, token: string | null) {
  const { method = "GET", body, signal, contentType } = options
  const raw = body instanceof Blob
  const headers: Record<string, string> = {}
  if (body) headers["Content-Type"] = contentType ?? "application/json"
  if (token) headers.Authorization = `Bearer ${token}`

  return fetch(`${BASE_URL}${path}`, {
    method,
    signal,
    credentials: "include",
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: body ? (raw ? body : JSON.stringify(body)) : undefined,
  })
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.auth ? await getAccessToken() : null
  let response = await send(path, options, token)

  // Un 401 con token suele ser un JWT vencido: se pide otro y se reintenta una vez.
  if (response.status === 401 && token) {
    clearAccessToken()
    const fresh = await getAccessToken()
    if (fresh) response = await send(path, options, fresh)
  }

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
