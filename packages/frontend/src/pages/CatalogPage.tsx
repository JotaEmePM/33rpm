import { useMemo, useState } from "react"
import { useSearchParams } from "react-router"
import { type CatalogFilters, FilterPanel } from "../components/catalog/FilterPanel"
import { GenreBar } from "../components/catalog/GenreBar"
import { ReleaseGrid } from "../components/catalog/ReleaseGrid"
import { type SortOption, SortSelect } from "../components/catalog/SortSelect"
import { SearchField } from "../components/layout/SearchField"
import { ErrorState, LoadingState } from "../components/ui/StateMessage"
import { useMeta } from "../hooks/useMeta"
import { useReleases } from "../hooks/useReleases"

const EMPTY_FILTERS: CatalogFilters = {
  formats: [],
  conditions: [],
  onlyInStock: false,
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<SortOption>("recientes")
  const meta = useMeta()

  const search = searchParams.get("q") ?? ""
  const genre = searchParams.get("genero")
  const onlyNew = searchParams.get("novedad") === "1"
  const conditionParam = searchParams.get("estado")

  const query = useMemo(
    () => ({
      search,
      genre,
      formats: filters.formats,
      conditions: conditionParam ? [conditionParam] : filters.conditions,
      onlyInStock: filters.onlyInStock,
      onlyNew,
      sort,
      pageSize: 48,
    }),
    [search, genre, onlyNew, conditionParam, filters, sort],
  )

  const { data, loading, error } = useReleases(query)

  function selectGenre(next: string | null) {
    const params = new URLSearchParams(searchParams)
    if (next) {
      params.set("genero", next)
    } else {
      params.delete("genero")
    }
    setSearchParams(params)
  }

  const heading = onlyNew
    ? "Recién llegados"
    : conditionParam
      ? `Discos ${conditionParam}`
      : "Catálogo"

  return (
    <>
      <section className="border-b-2 border-paper px-4 py-8 sm:px-6">
        <h1 className="font-display text-5xl uppercase sm:text-6xl">{heading}</h1>
        <p className="mt-2 text-muted">
          {data ? `${data.total} ${data.total === 1 ? "disco" : "discos"}` : "Consultando catálogo"}
          {search ? ` para “${search}”` : ""}
        </p>
      </section>

      <GenreBar genres={meta.genres} selected={genre} onSelect={selectGenre} />

      <div className="grid gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[16rem_1fr]">
        <div className="flex flex-col gap-4">
          <SearchField className="lg:hidden" />
          <FilterPanel
            filters={filters}
            formatOptions={meta.formats}
            conditionOptions={meta.conditions}
            onChange={setFilters}
            onReset={() => {
              setFilters(EMPTY_FILTERS)
              setSearchParams(new URLSearchParams())
            }}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <SortSelect value={sort} onChange={setSort} />
          </div>

          {error ? <ErrorState message={error} /> : null}
          {loading && !data ? <LoadingState label="Buscando discos" /> : null}
          {data ? <ReleaseGrid releases={data.items} /> : null}
        </div>
      </div>
    </>
  )
}
