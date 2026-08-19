import { LinkButton } from "../ui/LinkButton"

export function Hero() {
  return (
    <section className="border-b-2 border-paper px-4 py-10 sm:px-6 sm:py-14">
      <p className="label text-volt">Drop semanal · miércoles 12:00</p>
      <h1 className="mt-4 font-display text-6xl uppercase leading-[0.86] tracking-tight sm:text-8xl lg:text-poster">
        Vinilos
        <br />
        <span className="text-volt">nuevos</span> cada
        <br />
        miércoles
      </h1>
      <p className="mt-6 max-w-lg text-muted">
        Prensados nuevos, usados revisados uno por uno y rarezas que llegan en cantidades cortas.
        Reservamos por 48 horas.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <LinkButton to="/catalogo?novedad=1" variant="volt" size="lg">
          Ver el drop
        </LinkButton>
        <LinkButton to="/catalogo" variant="outline" size="lg">
          Catálogo completo
        </LinkButton>
      </div>
    </section>
  )
}
