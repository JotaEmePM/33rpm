import { type Ref, useState } from "react"
import type { Release } from "../../types"
import { ArrowLeftIcon } from "../icons/ArrowLeftIcon"
import { ArrowRightIcon } from "../icons/ArrowRightIcon"
import { Sleeve } from "../ui/Sleeve"

interface ReleaseGalleryProps {
  release: Release
  /** Punto de partida del vuelo al carrito: siempre la imagen grande. */
  sleeveRef: Ref<HTMLDivElement>
}

/**
 * Galería de la ficha: miniaturas al costado y flechas sobre la foto grande.
 * Sin zoom a propósito — el catálogo no tiene fotos de detalle que lo merezcan.
 */
export function ReleaseGallery({ release, sleeveRef }: ReleaseGalleryProps) {
  const images = release.images
  const [index, setIndex] = useState(0)
  const current = images[index]

  function move(step: number) {
    // Da la vuelta en los extremos: con pocas fotos, chocar contra el final molesta.
    setIndex((position) => (position + step + images.length) % images.length)
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
          {images.map((image, position) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setIndex(position)}
                aria-label={`Ver foto ${position + 1} de ${images.length}`}
                aria-current={position === index}
                className={`block size-16 shrink-0 overflow-hidden border-2 transition-colors ${
                  position === index ? "border-volt" : "border-ash hover:border-paper"
                }`}
              >
                <img src={image.url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative flex-1">
        <Sleeve
          ref={sleeveRef}
          artist={release.artist}
          title={release.title}
          src={current?.url}
          viewTransitionName={`sleeve-${release.id}`}
        />

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Foto anterior"
              className="absolute left-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center bg-ink/80 text-paper transition-colors hover:bg-volt hover:text-ink"
            >
              <ArrowLeftIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Foto siguiente"
              className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center bg-ink/80 text-paper transition-colors hover:bg-volt hover:text-ink"
            >
              <ArrowRightIcon className="size-5" />
            </button>
            <p className="label absolute bottom-0 right-0 bg-ink/80 px-2 py-1 text-muted">
              {index + 1}/{images.length}
            </p>
          </>
        ) : null}
      </div>
    </div>
  )
}
