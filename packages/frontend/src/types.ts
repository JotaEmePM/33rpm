export type ReleaseFormat = "LP" | "2LP" | "EP" | '7"' | "Box"

export type ReleaseCondition = "Nuevo" | "Usado"

export interface Track {
  position: string
  title: string
  duration: string
}

export interface Release {
  id: string
  artist: string
  title: string
  year: number
  genre: string
  label: string
  format: ReleaseFormat
  condition: ReleaseCondition
  /** Precio en pesos chilenos, sin decimales. */
  price: number
  stock: number
  /** Entró al catálogo en el último drop semanal. */
  isNew: boolean
  tracklist: Track[]
}

export interface CartLine {
  release: Release
  quantity: number
}
