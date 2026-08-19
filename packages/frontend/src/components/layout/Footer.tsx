import { Link } from "react-router"

const COLUMNS = [
  {
    title: "Tienda",
    links: [
      { label: "Catálogo", to: "/catalogo" },
      { label: "Novedades", to: "/catalogo?novedad=1" },
      { label: "Usados", to: "/catalogo?estado=Usado" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { label: "Despachos", to: "/catalogo" },
      { label: "Cambios", to: "/catalogo" },
      { label: "Contacto", to: "/catalogo" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="mt-auto border-t-2 border-paper">
      <div className="flex flex-wrap gap-10 px-4 py-10 sm:px-6">
        {COLUMNS.map((column) => (
          <div key={column.title} className="flex flex-col gap-3">
            <h3 className="label text-volt">{column.title}</h3>
            {column.links.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-sm text-muted transition-colors hover:text-paper"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
        <div className="flex max-w-xs flex-col gap-3">
          <h3 className="label text-volt">Visítanos</h3>
          <p className="text-sm text-muted">[DIRECCIÓN DE LA TIENDA] · [HORARIO] · [TELÉFONO]</p>
        </div>
      </div>
      <div className="flex items-center justify-between bg-volt px-4 py-3 text-ink sm:px-6">
        <span className="font-display text-xl uppercase">Discos nuevos cada miércoles</span>
        <span className="label">33rpm</span>
      </div>
    </footer>
  )
}
