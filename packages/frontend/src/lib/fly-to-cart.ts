const DURATION_MS = 620
const LANDING_SIZE = 40

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Clona la carátula y la lanza en arco hasta el icono del carrito.
 * Resuelve cuando aterriza, para que el contador sume justo después.
 */
export function flyToCart(source: HTMLElement, target: HTMLElement): Promise<void> {
  const from = source.getBoundingClientRect()
  const to = target.getBoundingClientRect()

  const clone = source.cloneNode(true) as HTMLElement
  clone.setAttribute("aria-hidden", "true")
  Object.assign(clone.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: "0",
    zIndex: "50",
    pointerEvents: "none",
    willChange: "transform, opacity",
  })
  document.body.appendChild(clone)

  const deltaX = to.left + to.width / 2 - (from.left + from.width / 2)
  const deltaY = to.top + to.height / 2 - (from.top + from.height / 2)
  const endScale = LANDING_SIZE / from.width

  const animation = clone.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      {
        // El punto alto del arco: sube antes de caer sobre el carrito.
        transform: `translate(${deltaX * 0.55}px, ${deltaY * 0.55 - 90}px) scale(${
          (1 + endScale) / 2
        })`,
        opacity: 0.95,
        offset: 0.55,
      },
      {
        transform: `translate(${deltaX}px, ${deltaY}px) scale(${endScale})`,
        opacity: 0.15,
      },
    ],
    { duration: DURATION_MS, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "forwards" },
  )

  return animation.finished
    .catch(() => undefined)
    .then(() => {
      clone.remove()
    })
}

/** Golpe seco del contador cuando entra un disco. */
export function pulse(element: HTMLElement): void {
  element.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.25)", offset: 0.4 },
      { transform: "scale(1)" },
    ],
    { duration: 260, easing: "cubic-bezier(0.2, 0, 0, 1)" },
  )
}
