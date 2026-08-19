import { Link, NavLink } from "react-router"
import { CartButton } from "./CartButton"
import { SearchField } from "./SearchField"

const NAV = [
  { to: "/catalogo", label: "Catálogo" },
  { to: "/catalogo?novedad=1", label: "Novedades" },
  { to: "/catalogo?estado=Usado", label: "Usados" },
]

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b-2 border-paper bg-ink">
      <div className="flex flex-wrap items-stretch">
        <Link
          to="/"
          className="flex items-center bg-volt px-5 py-3 font-display text-2xl tracking-wide text-ink"
        >
          33RPM
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto px-2" aria-label="Principal">
          {NAV.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end
              className={({ isActive }) =>
                `label flex min-h-11 items-center whitespace-nowrap px-3 transition-colors hover:text-volt ${
                  isActive ? "text-volt" : "text-paper"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-l-0 px-3 py-2 sm:border-l-2 sm:border-paper">
          <SearchField className="hidden w-56 lg:flex" />
          <CartButton />
        </div>
      </div>
    </header>
  )
}
