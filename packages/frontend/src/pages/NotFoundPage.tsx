import { LinkButton } from "../components/ui/LinkButton"

export function NotFoundPage() {
  return (
    <section className="flex flex-col items-start gap-6 px-4 py-20 sm:px-6">
      <p className="label text-volt">Error 404</p>
      <h1 className="font-display text-6xl uppercase leading-[0.86] sm:text-8xl">
        Ese disco
        <br />
        no está
        <br />
        en la tienda
      </h1>
      <LinkButton to="/catalogo" size="lg">
        Volver al catálogo
      </LinkButton>
    </section>
  )
}
