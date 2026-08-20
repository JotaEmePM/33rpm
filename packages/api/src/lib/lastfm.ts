import { env } from "../config/env.js"
import { logger } from "./logger.js"
import { ValidationError } from "./validation.js"

const API = "https://ws.audioscrobbler.com/2.0/"

export function isLastfmConfigured(): boolean {
  return Boolean(env.lastfmApiKey)
}

export interface AlbumTrack {
  position: string
  title: string
  duration: string
}

export interface AlbumInfo {
  artist: string
  title: string
  url: string
  tracklist: AlbumTrack[]
  /** Etiquetas de Last.fm, por si alguna sirve de género. */
  tags: string[]
  /** Portada de Last.fm en el tamaño que copia la tienda, si la hay. */
  imageUrl: string | null
}

/**
 * Saca artista y álbum de una URL de Last.fm del tipo
 * https://www.last.fm/music/Radiohead/In+Rainbows
 */
export function parseAlbumUrl(raw: string): { artist: string; album: string } {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new ValidationError(["La URL de Last.fm no es válida"])
  }

  if (!/(^|\.)last\.fm$/.test(url.hostname)) {
    throw new ValidationError(["La URL debe ser de last.fm"])
  }

  const [music, artist, album] = url.pathname.split("/").filter(Boolean)
  if (music !== "music" || !artist || !album) {
    throw new ValidationError(["La URL debe apuntar a un álbum: /music/Artista/Album"])
  }

  // Last.fm escribe los espacios como "+" dentro del path.
  const decode = (part: string) => decodeURIComponent(part.replace(/\+/g, " "))
  return { artist: decode(artist), album: decode(album) }
}

/**
 * Tamaño de portada que se copia al catálogo. `large` son 174x174; `extralarge`
 * y `mega` son la misma imagen más grande, y sirven cambiando esta constante.
 */
const COVER_SIZE = "large"

/** Last.fm devuelve siempre esta imagen cuando el álbum no tiene portada. */
const PLACEHOLDER = "2a96cbd8b46e442fc41c2b86b821562f"

function pickCover(images: { "#text"?: string; size?: string }[]): string {
  const preferred = [COVER_SIZE, "extralarge", "mega"]
  for (const size of preferred) {
    const url = images.find((image) => image.size === size)?.["#text"]
    if (url && !url.includes(PLACEHOLDER)) return url
  }
  return ""
}

function seconds(value: unknown): string {
  const total = Number(value)
  if (!Number.isFinite(total) || total <= 0) return ""
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

interface LastfmAlbum {
  name?: string
  artist?: string
  url?: string
  image?: { "#text"?: string; size?: string }[]
  tags?: { tag?: { name?: string }[] } | string
  tracks?: { track?: unknown }
}

/** Devuelve la ficha del álbum, o null si Last.fm no lo conoce. */
export async function fetchAlbumInfo(artist: string, album: string): Promise<AlbumInfo | null> {
  const query = new URLSearchParams({
    method: "album.getinfo",
    api_key: env.lastfmApiKey ?? "",
    artist,
    album,
    format: "json",
    autocorrect: "1",
  })

  const response = await fetch(`${API}?${query}`, { signal: AbortSignal.timeout(10_000) })
  const payload = (await response.json().catch(() => null)) as {
    album?: LastfmAlbum
    error?: number
    message?: string
  } | null

  if (!response.ok || !payload || payload.error) {
    // El 6 de Last.fm es "no existe"; el resto sí merece quedar en el log.
    if (payload?.error !== 6) {
      logger.warn(
        { artist, album, error: payload?.error, message: payload?.message },
        "Last.fm no respondió",
      )
    }
    return null
  }

  const data = payload.album
  if (!data?.name) return null

  const rawTracks = data.tracks?.track
  const tracks = Array.isArray(rawTracks) ? rawTracks : rawTracks ? [rawTracks] : []

  const cover = pickCover(data.image ?? [])

  return {
    artist: data.artist ?? artist,
    title: data.name,
    url: data.url ?? "",
    tracklist: tracks.map((track, index) => {
      const item = track as { name?: string; duration?: unknown; "@attr"?: { rank?: unknown } }
      return {
        // Last.fm numera correlativo; las caras del vinilo las pone la tienda.
        position: String(Number(item["@attr"]?.rank ?? index + 1)),
        title: item.name ?? "",
        duration: seconds(item.duration),
      }
    }),
    tags:
      typeof data.tags === "object" && data.tags?.tag
        ? data.tags.tag.map((tag) => tag.name ?? "").filter(Boolean)
        : [],
    imageUrl: cover || null,
  }
}

export async function fetchAlbumByUrl(url: string): Promise<AlbumInfo | null> {
  const { artist, album } = parseAlbumUrl(url)
  return fetchAlbumInfo(artist, album)
}
