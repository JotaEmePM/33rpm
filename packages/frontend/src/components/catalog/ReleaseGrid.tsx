import type { Release } from "../../types"
import { ReleaseCard } from "./ReleaseCard"

interface ReleaseGridProps {
  releases: Release[]
  /** Anima el reacomodo de las cards al cambiar filtros u orden. */
  animated?: boolean
}

export function ReleaseGrid({ releases, animated = false }: ReleaseGridProps) {
  if (releases.length === 0) {
    return (
      <p className="border-2 border-dashed border-steel p-10 text-center text-muted">
        Ningún disco calza con estos filtros.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 border-l border-t border-ash sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {releases.map((release) => (
        <ReleaseCard key={release.id} release={release} animated={animated} />
      ))}
    </div>
  )
}
