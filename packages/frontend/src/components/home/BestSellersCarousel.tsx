import { useCallback, useEffect, useRef, useState } from "react"
import type { Release } from "../../types"
import { ArrowLeftIcon } from "../icons/ArrowLeftIcon"
import { ArrowRightIcon } from "../icons/ArrowRightIcon"
import { BestSellerSlide } from "./BestSellerSlide"

interface BestSellersCarouselProps {
  releases: Release[]
  /** Cada cuánto avanza solo, en milisegundos. */
  intervalMs?: number
}

function isAtEnd(track: HTMLElement): boolean {
  return track.scrollLeft + track.clientWidth >= track.scrollWidth - 8
}

export function BestSellersCarousel({ releases, intervalMs = 4000 }: BestSellersCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [atEnd, setAtEnd] = useState(false)
  const [paused, setPaused] = useState(false)

  const goTo = useCallback((next: number) => {
    const track = trackRef.current
    if (!track) return
    const slides = Array.from(track.children) as HTMLElement[]
    if (slides.length === 0) return

    const target = slides[Math.max(0, Math.min(next, slides.length - 1))]
    const left =
      track.scrollLeft + target.getBoundingClientRect().left - track.getBoundingClientRect().left
    track.scrollTo({ left, behavior: "smooth" })
  }, [])

  // Mantiene indicadores y flechas en sincronía cuando alguien desplaza el carrusel a mano.
  const handleScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const trackLeft = track.getBoundingClientRect().left
    const slides = Array.from(track.children) as HTMLElement[]

    let closest = 0
    let shortest = Number.POSITIVE_INFINITY
    slides.forEach((slide, position) => {
      const distance = Math.abs(slide.getBoundingClientRect().left - trackLeft)
      if (distance < shortest) {
        shortest = distance
        closest = position
      }
    })

    setIndex(closest)
    setAtEnd(isAtEnd(track))
  }, [])

  useEffect(() => {
    if (paused || releases.length < 2) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const id = window.setInterval(() => {
      const track = trackRef.current
      if (!track) return
      goTo(isAtEnd(track) ? 0 : index + 1)
    }, intervalMs)

    return () => window.clearInterval(id)
  }, [index, paused, intervalMs, releases.length, goTo])

  return (
    <section
      aria-label="Más vendidos del mes"
      aria-roledescription="carrusel"
      className="flex flex-col gap-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {releases.map((release, position) => (
          <div key={release.id} className="flex w-64 shrink-0 sm:w-72">
            <BestSellerSlide release={release} position={position + 1} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {releases.map((release, position) => (
            <span
              key={release.id}
              className={`h-1 flex-1 transition-colors ${
                position === index ? "bg-volt" : "bg-steel"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label="Ver discos anteriores"
            className="flex size-11 items-center justify-center border-2 border-steel transition-colors hover:border-volt hover:text-volt disabled:opacity-30"
          >
            <ArrowLeftIcon />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={atEnd}
            aria-label="Ver discos siguientes"
            className="flex size-11 items-center justify-center border-2 border-steel transition-colors hover:border-volt hover:text-volt disabled:opacity-30"
          >
            <ArrowRightIcon />
          </button>
        </div>
      </div>
    </section>
  )
}
