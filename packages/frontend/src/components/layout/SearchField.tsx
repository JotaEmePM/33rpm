import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router"
import { SearchIcon } from "../icons/SearchIcon"

export function SearchField({ className = "" }: { className?: string }) {
  const [query, setQuery] = useState("")
  const navigate = useNavigate()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? `/catalogo?q=${encodeURIComponent(trimmed)}` : "/catalogo", {
      viewTransition: true,
    })
  }

  return (
    <search
      className={`flex min-h-11 items-center gap-2 border-2 border-steel px-3 focus-within:border-volt ${className}`}
    >
      <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
        <SearchIcon className="size-4 shrink-0 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Artista, disco o sello"
          aria-label="Buscar en el catálogo"
          className="w-full bg-transparent text-sm text-paper placeholder:text-muted focus:outline-none"
        />
      </form>
    </search>
  )
}
