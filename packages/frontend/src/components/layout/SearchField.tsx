import { type FormEvent, type KeyboardEvent, useId, useState } from "react"
import { Link, useNavigate } from "react-router"
import { useSearchSuggestions } from "../../hooks/useSearchSuggestions"
import { SearchIcon } from "../icons/SearchIcon"
import { Price } from "../ui/Price"

export function SearchField({ className = "" }: { className?: string }) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  // -1 significa "ningún sugerido elegido": Enter busca en el catálogo completo.
  const [highlighted, setHighlighted] = useState(-1)
  const navigate = useNavigate()
  const listId = useId()

  const { query: searched, items, loading, enabled } = useSearchSuggestions(query)
  const showPanel = open && enabled
  const optionId = (index: number) => `${listId}-opcion-${index}`

  function goToCatalog(term: string) {
    const trimmed = term.trim()
    close()
    navigate(trimmed ? `/catalogo?q=${encodeURIComponent(trimmed)}` : "/catalogo", {
      viewTransition: true,
    })
  }

  function close() {
    setOpen(false)
    setHighlighted(-1)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const chosen = items[highlighted]
    if (chosen) {
      close()
      navigate(`/disco/${chosen.id}`, { viewTransition: true })
      return
    }
    goToCatalog(query)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      close()
      return
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!showPanel || items.length === 0) return
      event.preventDefault()
      setHighlighted((current) => {
        const next = event.key === "ArrowDown" ? current + 1 : current - 1
        // Al pasarse por abajo se vuelve al campo, y por arriba al último.
        if (next >= items.length) return -1
        if (next < -1) return items.length - 1
        return next
      })
    }
  }

  return (
    <search
      className={`relative flex flex-col ${className}`}
      // El panel se cierra al salir del componente, no al tocar dentro de él.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex min-h-11 w-full items-center gap-2 border-2 border-steel px-3 focus-within:border-volt"
      >
        <SearchIcon className="size-4 shrink-0 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setHighlighted(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Artista, disco o sello"
          aria-label="Buscar en el catálogo"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={highlighted >= 0 ? optionId(highlighted) : undefined}
          autoComplete="off"
          className="w-full bg-transparent text-sm text-paper placeholder:text-muted focus:outline-none"
        />
      </form>

      {showPanel ? (
        <div className="absolute left-0 right-0 top-full z-30 border-2 border-t-0 border-volt bg-ink">
          {/* Div y no lista: el rol listbox pide que sus opciones sean hijas directas. */}
          <div
            id={listId}
            role="listbox"
            aria-label="Sugerencias"
            className="max-h-80 overflow-y-auto"
          >
            {items.map((release, index) => (
              <Link
                key={release.id}
                to={`/disco/${release.id}`}
                viewTransition
                id={optionId(index)}
                role="option"
                aria-selected={index === highlighted}
                onClick={close}
                onPointerMove={() => setHighlighted(index)}
                className={`flex items-center justify-between gap-3 border-b border-ash px-3 py-2 last:border-b-0 ${
                  index === highlighted ? "bg-smoke text-volt" : "text-paper"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  {release.images[0] ? (
                    <img
                      src={release.images[0].url}
                      alt=""
                      loading="lazy"
                      className="size-10 shrink-0 object-cover"
                    />
                  ) : null}
                  <span className="min-w-0">
                    <span className="block truncate font-display text-lg uppercase leading-tight">
                      {release.title}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {release.artist} · {release.label}
                    </span>
                  </span>
                </span>
                <Price value={release.price} size="sm" />
              </Link>
            ))}
          </div>

          {items.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">
              {loading ? "Buscando…" : `Sin coincidencias para “${searched}”`}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => goToCatalog(query)}
            className="label w-full border-t-2 border-volt px-3 py-3 text-left text-volt transition-colors hover:bg-volt hover:text-ink"
          >
            Ver todo el catálogo para “{query.trim()}”
          </button>
        </div>
      ) : null}

      {/* Los lectores de pantalla necesitan que el recuento se anuncie solo. */}
      <span role="status" aria-live="polite" className="sr-only">
        {showPanel && !loading
          ? `${items.length} ${items.length === 1 ? "sugerencia" : "sugerencias"} para ${searched}`
          : ""}
      </span>
    </search>
  )
}
