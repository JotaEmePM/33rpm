import type { Track } from "../types"
import { request } from "./client"

export interface AlbumInfo {
  artist: string
  title: string
  url: string
  tracklist: Track[]
  /** Etiquetas de Last.fm; sirven para adivinar el género. */
  tags: string[]
  imageUrl: string | null
}

/** Ficha del álbum a partir de su URL de Last.fm. La clave vive en el API. */
export function fetchAlbumInfo(url: string): Promise<AlbumInfo> {
  return request<AlbumInfo>(`/api/lastfm/album?url=${encodeURIComponent(url)}`, { auth: true })
}
