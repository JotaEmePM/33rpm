import { type DependencyList, useEffect, useState } from "react"
import { ApiError } from "../api/client"

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Ejecuta una petición cuando cambian las dependencias y cancela la anterior,
 * para que una respuesta lenta no pise a una más reciente.
 */
export function useAsync<T>(
  run: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })

  useEffect(() => {
    const controller = new AbortController()
    setState((current) => ({ ...current, loading: true, error: null }))

    run(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const message =
          error instanceof ApiError
            ? error.message
            : "No pudimos contactar la tienda. ¿Está corriendo la API?"
        setState({ data: null, loading: false, error: message })
      })

    return () => controller.abort()
    // biome-ignore lint/correctness/useExhaustiveDependencies: las dependencias las decide quien llama
  }, deps)

  return state
}
