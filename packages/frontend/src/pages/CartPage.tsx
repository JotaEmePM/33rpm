import { CartLineItem } from "../components/cart/CartLineItem"
import { CartSummary } from "../components/cart/CartSummary"
import { EmptyCart } from "../components/cart/EmptyCart"
import { LinkButton } from "../components/ui/LinkButton"
import { useCart } from "../hooks/useCart"

export function CartPage() {
  const { lines, itemCount, subtotal, clear } = useCart()

  return (
    <section className="px-4 py-8 sm:px-6">
      <h1 className="border-b-2 border-paper pb-4 font-display text-5xl uppercase sm:text-6xl">
        Carrito
      </h1>

      {lines.length === 0 ? (
        <div className="mt-8">
          <EmptyCart />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div>
            {lines.map((line) => (
              <CartLineItem key={line.release.id} line={line} />
            ))}
            <button
              type="button"
              onClick={clear}
              className="label mt-4 min-h-11 text-muted transition-colors hover:text-volt"
            >
              Vaciar carrito
            </button>
          </div>

          <CartSummary
            subtotal={subtotal}
            itemCount={itemCount}
            action={
              <LinkButton to="/checkout" size="lg" className="w-full">
                Continuar
              </LinkButton>
            }
          />
        </div>
      )}
    </section>
  )
}
