import type { Release } from "../../types"
import { SectionHeading } from "../ui/SectionHeading"
import { BestSellersCarousel } from "./BestSellersCarousel"

interface BestSellersProps {
  releases: Release[]
  title?: string
  aside?: string
}

export function BestSellers({
  releases,
  title = "Más vendidos del mes",
  aside = "Actualizado cada lunes",
}: BestSellersProps) {
  return (
    <section className="border-b-2 border-paper px-4 py-10 sm:px-6">
      <SectionHeading title={title} aside={aside} />
      <div className="mt-6">
        <BestSellersCarousel releases={releases} />
      </div>
    </section>
  )
}
