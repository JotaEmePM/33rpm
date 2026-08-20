/**
 * Reduce la foto antes de subirla: las cámaras de teléfono entregan archivos de
 * varios megas que ni el catálogo necesita ni conviene servir a cada visita.
 * Se hace en el navegador para que al API sólo llegue lo que se va a guardar.
 */

const MAX_SIDE = 1600
const QUALITY = 0.85

export interface ResizedImage {
  blob: Blob
  width: number
  height: number
}

function scaleTo(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= MAX_SIDE) return { width, height }
  const factor = MAX_SIDE / longest
  return { width: Math.round(width * factor), height: Math.round(height * factor) }
}

export async function resizeImage(file: File): Promise<ResizedImage> {
  const bitmap = await createImageBitmap(file)
  const size = scaleTo(bitmap.width, bitmap.height)

  const canvas = document.createElement("canvas")
  canvas.width = size.width
  canvas.height = size.height

  const context = canvas.getContext("2d")
  if (!context) {
    bitmap.close()
    throw new Error("El navegador no pudo preparar la imagen")
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    // WebP pesa bastante menos que JPEG a la misma calidad y lo entienden todos
    // los navegadores que soportan este panel.
    canvas.toBlob(resolve, "image/webp", QUALITY),
  )
  if (!blob) throw new Error("No pudimos preparar la imagen")

  return { blob, width: size.width, height: size.height }
}
