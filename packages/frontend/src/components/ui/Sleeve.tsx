interface SleeveProps {
  artist: string
  title: string
  /** Define el ancho de la carátula; el alto sale del aspecto 1:1. */
  className?: string
}

function initials(artist: string): string {
  return artist
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

/**
 * Carátula de relleno mientras el catálogo no tenga imágenes.
 * Dibuja el disco en vez de intentar imitar una portada.
 */
export function Sleeve({ artist, title, className = "w-full" }: SleeveProps) {
  return (
    <div
      className={`relative aspect-square overflow-hidden bg-smoke ${className}`}
      role="img"
      aria-label={`Carátula pendiente: ${artist} — ${title}`}
    >
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="34" fill="none" stroke="var(--color-steel)" strokeWidth="12" />
        <circle cx="50" cy="50" r="26" fill="none" stroke="var(--color-ash)" strokeWidth="1" />
        <circle cx="50" cy="50" r="9" fill="var(--color-volt)" />
        <circle cx="50" cy="50" r="1.6" fill="var(--color-ink)" />
      </svg>
      <span className="label absolute bottom-2 left-2 text-muted">{initials(artist)}</span>
    </div>
  )
}
