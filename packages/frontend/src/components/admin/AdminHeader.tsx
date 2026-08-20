import type { ReactNode } from "react"
import { NavLink } from "react-router"

const TABS = [
  { to: "/admin/productos", label: "Productos" },
  { to: "/admin/productos/nuevo", label: "Nuevo disco" },
  { to: "/admin/fotos", label: "Fotos" },
]

export function AdminHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="border-b-2 border-paper">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <div>
          <p className="label text-volt">Administración</p>
          <h1 className="mt-2 font-display text-4xl uppercase sm:text-5xl">{title}</h1>
        </div>
        {action}
      </div>
      <nav className="flex gap-1 px-2" aria-label="Secciones de administración">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            viewTransition
            className={({ isActive }) =>
              `label min-h-11 border-b-2 px-3 pt-3 transition-colors ${
                isActive
                  ? "border-volt text-volt"
                  : "border-transparent text-muted hover:text-paper"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
