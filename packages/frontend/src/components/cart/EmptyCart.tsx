import { LinkButton } from "../ui/LinkButton"

export function EmptyCart() {
  return (
    <div className="flex flex-col items-start gap-6 border-2 border-dashed border-steel p-10">
      <p className="font-display text-4xl uppercase leading-tight">
        El carrito
        <br />
        está vacío
      </p>
      <p className="max-w-sm text-muted">
        Los discos reservados se guardan 48 horas antes de volver al catálogo.
      </p>
      <LinkButton to="/catalogo">Ir al catálogo</LinkButton>
    </div>
  )
}
