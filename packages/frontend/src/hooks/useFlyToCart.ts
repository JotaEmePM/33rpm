import { useContext } from "react"
import { FlyToCartContext, type FlyToCartValue } from "../context/fly-to-cart-context"

/** Sin provider (por ejemplo en pruebas) el vuelo se salta y el disco entra igual. */
const NOOP: FlyToCartValue = {
  registerTarget: () => undefined,
  flyToCart: () => Promise.resolve(),
}

export function useFlyToCart(): FlyToCartValue {
  return useContext(FlyToCartContext) ?? NOOP
}
