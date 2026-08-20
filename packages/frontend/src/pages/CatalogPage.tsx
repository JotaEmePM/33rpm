import { useLoaderData, useNavigation, useSearchParams } from "react-router"
import type { ReleasePage } from "../api/releases"
import { type CatalogFilters, FilterPanel } from "../components/catalog/FilterPanel"
import { GenreBar } from "../components/catalog/GenreBar"
import { ReleaseGrid } from "../components/catalog/ReleaseGrid"
import { type SortOption, SortSelect } from "../components/catalog/SortSelect"
import { SearchField } from "../components/layout/SearchField"
import { useMeta } from "../hooks/useMeta"

/** Cada cambio de filtro es una navegación: la URL queda enlazable y el router anima la lista. */
const NAVIGATE_OPTIONS = { viewTransition: true } as const

export function CatalogPage() {
  const data = useLoaderData() as ReleasePage
  const [searchParams, setSearchParams] = useSearchParams()
  const navigation = useNavigation()
  const meta = useMeta()

  const search = searchParams.get("q") ?? ""
  const genre = searchParams.get("genero")
  const onlyNew = searchParams.get("novedad") === "1"
  const conditionParam = searchParams.get("estado")

  const filters: CatalogFilters = {
    formats: searchParams.get("formato")?.split(",").filter(Boolean) ?? [],
    conditions: conditionParam?.split(",").filter(Boolean) ?? [],
    onlyInStock: searchParams.get("stock") === "1",
  }

  const sort = (searchParams.get("orden") ?? "recientes") as SortOption

  function update(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams)
    mutate(params)
    setSearchParams(params, NAVIGATE_OPTIONS)
  }

  function setList(params: URLSearchParams, key: string, values: string[]) {
    if (values.length > 0) {
      params.set(key, values.join(","))
    } else {
      params.delete(key)
    }
  }

  const heading = onlyNew
    ? "Recién llegados"
    : conditionParam && !conditionParam.includes(",")
      ? `Discos ${conditionParam}`
      : "Catálogo"

  return (
    <>
      <section className="border-b-2 border-paper px-4 py-8 sm:px-6">
        <h1 className="font-display text-5xl uppercase sm:text-6xl">{heading}</h1>
        <p className="mt-2 text-muted">
          {data.total} {data.total === 1 ? "disco" : "discos"}
          {search ? ` para “${search}”` : ""}
          {navigation.state === "loading" ? " · actualizando" : ""}
        </p>
      </section>

      <GenreBar
        genres={meta.genres}
        selected={genre}
        onSelect={(next) =>
          update((params) => {
            if (next) {
              params.set("genero", next)
            } else {
              params.delete("genero")
            }
          })
        }
      />

      <div className="grid gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[16rem_1fr]">
        <div className="flex flex-col gap-4">
          <SearchField className="lg:hidden" />
          <FilterPanel
            filters={filters}
            formatOptions={meta.formats}
            conditionOptions={meta.conditions}
            onChange={(next) =>
              update((params) => {
                setList(params, "formato", next.formats)
                setList(params, "estado", next.conditions)
                if (next.onlyInStock) {
                  params.set("stock", "1")
                } else {
                  params.delete("stock")
                }
              })
            }
            onReset={() => setSearchParams(new URLSearchParams(), NAVIGATE_OPTIONS)}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <SortSelect
              value={sort}
              onChange={(next) => update((params) => params.set("orden", next))}
            />
          </div>

          <ReleaseGrid releases={data.items} animated />
        </div>
      </div>
    </>
  )
}
