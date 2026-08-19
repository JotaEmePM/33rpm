import type { Release } from "../../types"
import { SectionHeading } from "../ui/SectionHeading"
import { BestSellersCarousel } from "./BestSellersCarousel"

export function BestSellers({ releases }: { releases: Release[] }) {
  return (
    <section className="border-b-2 border-paper px-4 py-10 sm:px-6">
      <SectionHeading title="Más vendidos del mes" aside="Actualizado cada lunes" />
      <div className="mt-6">
        <BestSellersCarousel releases={releases} />
      </div>
    </section>
  )
}
