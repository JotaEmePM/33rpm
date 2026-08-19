import { countReleases, createRelease } from "../repositories/releases.js"
import { transaction } from "./connection.js"
import { SEED_RELEASES } from "./seed-data.js"

/** Siembra el catálogo inicial sólo si la base está vacía. */
export function seed(): void {
  if (countReleases() > 0) return

  transaction(() => {
    for (const release of SEED_RELEASES) {
      createRelease(release)
    }
  })

  console.log(`seed: ${SEED_RELEASES.length} discos cargados`)
}
