import { type RefObject, useEffect, useRef, useState } from "react"
import { useCart } from "../../hooks/useCart"
import { useFlyToCart } from "../../hooks/useFlyToCart"
import type { Release } from "../../types"
import { CheckIcon } from "../icons/CheckIcon"
import { Badge } from "../ui/Badge"
import { Button } from "../ui/Button"
import { Price } from "../ui/Price"
import { QuantityStepper } from "../ui/QuantityStepper"

interface AddToCartPanelProps {
  release: Release
  /** Carátula de la ficha: es la que vuela al carrito. */
  sleeveRef?: RefObject<HTMLDivElement | null>
}

export function AddToCartPanel({ release, sleeveRef }: AddToCartPanelProps) {
  const { add } = useCart()
  const { flyToCart } = useFlyToCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const soldOut = release.stock === 0

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function handleAdd() {
    await flyToCart(sleeveRef?.current ?? null)
    add(release, quantity)
    // El vuelo dura más que un clic en "atrás": el disco entra igual, el aviso no.
    if (mounted.current) setAdded(true)
  }

  return (
    <div className="flex flex-col gap-4 border-2 border-paper p-5">
      <div className="flex items-center justify-between gap-3">
        <Price value={release.price} size="lg" />
        {soldOut ? <Badge>Agotado</Badge> : <Badge tone="volt">{release.stock} en bodega</Badge>}
      </div>

      {soldOut ? (
        <p className="text-sm text-muted">
          Se agotó este prensado. Escríbenos y avisamos si vuelve a entrar.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper value={quantity} max={release.stock} onChange={setQuantity} />
          <Button onClick={handleAdd} size="lg" className="flex-1">
            {added ? (
              <>
                <CheckIcon /> Agregado
              </>
            ) : (
              "Agregar al carrito"
            )}
          </Button>
        </div>
      )}

      <p className="label text-muted">Retiro en tienda o despacho a todo Chile</p>
    </div>
  )
}
