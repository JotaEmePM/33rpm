export type ReleaseFormat = "LP" | "2LP" | "EP" | '7"' | "Box"

export type ReleaseCondition = "Nuevo" | "Usado"

export interface Track {
  position: string
  title: string
  duration: string
}

export interface ReleaseImage {
  id: string
  url: string
  pathname: string
  /** La que representa al disco en catálogo y buscador. */
  isPrimary: boolean
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
  /** Anunciado antes de llegar a la tienda. */
  isPreorder: boolean
  /** Elegido para la portada. */
  isFeatured: boolean
  /** Un disco no visible sigue en el catálogo pero no se muestra en la tienda. */
  visible: boolean
  /** Ficha del álbum en Last.fm, de donde se copian pistas y datos. */
  lastfmUrl: string | null
  /** En los listados llega sólo la principal; en la ficha, todas. */
  images: ReleaseImage[]
  tracklist: Track[]
}

export interface CartLine {
  release: Release
  quantity: number
}
