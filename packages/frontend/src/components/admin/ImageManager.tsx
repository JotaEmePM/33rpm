import { type ChangeEvent, useRef, useState } from "react"
import { ApiError } from "../../api/client"
import { deleteImage, setPrimaryImage, uploadImage } from "../../api/releases"
import { resizeImage } from "../../lib/image-resize"
import type { ReleaseImage } from "../../types"
import { Button } from "../ui/Button"

interface ImageManagerProps {
  releaseId: string
  images: ReleaseImage[]
  /** El disco al que pertenecen, sólo para el texto alternativo. */
  label: string
  onChange: (images: ReleaseImage[]) => void
  compact?: boolean
}

/**
 * Subida y orden de las fotos de un disco. La primera que entra queda de
 * portada; desde aquí se puede pasar esa marca a cualquier otra.
 */
export function ImageManager({
  releaseId,
  images,
  label,
  onChange,
  compact = false,
}: ImageManagerProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function fail(caught: unknown, fallback: string) {
    setError(caught instanceof ApiError ? caught.message : fallback)
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (files.length === 0) return

    setError(null)
    let current = images

    // De una en una: así el orden del archivo se respeta y la primera es la portada.
    for (const [position, file] of files.entries()) {
      setBusy(`Subiendo ${position + 1} de ${files.length}…`)
      try {
        const { blob } = await resizeImage(file)
        const image = await uploadImage(releaseId, blob, file.name)
        current = [...current, image]
        onChange(current)
      } catch (caught) {
        fail(caught, `No pudimos subir ${file.name}`)
        break
      }
    }

    setBusy(null)
  }

  async function handlePrimary(imageId: string) {
    setError(null)
    setBusy("Cambiando la portada…")
    try {
      onChange((await setPrimaryImage(releaseId, imageId)).items)
    } catch (caught) {
      fail(caught, "No pudimos cambiar la portada")
    }
    setBusy(null)
  }

  async function handleDelete(imageId: string) {
    setError(null)
    setBusy("Quitando la foto…")
    try {
      onChange((await deleteImage(releaseId, imageId)).items)
    } catch (caught) {
      fail(caught, "No pudimos quitar la foto")
    }
    setBusy(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size={compact ? "sm" : "md"}
          onClick={() => fileInput.current?.click()}
          disabled={busy !== null}
        >
          {images.length > 0 ? "Añadir fotos" : "Subir fotos"}
        </Button>
        {busy ? (
          <span className="label text-muted" role="status">
            {busy}
          </span>
        ) : null}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        onChange={handleFiles}
        className="sr-only"
        aria-label={`Fotos de ${label}`}
      />

      {images.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {images.map((image) => (
            <li key={image.id} className="flex flex-col gap-1">
              <div
                className={`relative size-24 overflow-hidden border-2 ${
                  image.isPrimary ? "border-volt" : "border-ash"
                }`}
              >
                <img src={image.url} alt="" className="size-full object-cover" />
                {image.isPrimary ? (
                  <span className="label absolute inset-x-0 bottom-0 bg-volt px-1 text-center text-ink">
                    Portada
                  </span>
                ) : null}
              </div>
              <div className="flex gap-2">
                {image.isPrimary ? null : (
                  <button
                    type="button"
                    onClick={() => handlePrimary(image.id)}
                    disabled={busy !== null}
                    className="label text-muted transition-colors hover:text-volt disabled:opacity-40"
                  >
                    Portada
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(image.id)}
                  disabled={busy !== null}
                  className="label text-muted transition-colors hover:text-volt disabled:opacity-40"
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Sin fotos todavía.</p>
      )}

      {error ? (
        <p className="border-2 border-volt p-3 text-sm text-volt" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
