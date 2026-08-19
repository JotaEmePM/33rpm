import type { Release } from "../../types"
import { ReleaseGrid } from "../catalog/ReleaseGrid"
import { LinkButton } from "../ui/LinkButton"
import { SectionHeading } from "../ui/SectionHeading"

export function NewReleases({ releases, total }: { releases: Release[]; total: number }) {
  return (
    <section className="border-b-2 border-paper px-4 py-10 sm:px-6">
      <SectionHeading title="Recién llegados" aside={`${total} títulos en catálogo`} />
      <div className="mt-6">
        <ReleaseGrid releases={releases} />
      </div>
      <div className="mt-6">
        <LinkButton to="/catalogo" variant="outline">
          Ver todo el catálogo
        </LinkButton>
      </div>
    </section>
  )
}
