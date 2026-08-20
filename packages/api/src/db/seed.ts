import { countReleases, createRelease } from "../repositories/releases.js"
import { transaction } from "./connection.js"
import { SEED_RELEASES } from "./seed-data.js"

/** Siembra el catálogo inicial sólo si la base está vacía. */
export async function seed(): Promise<void> {
  if ((await countReleases()) > 0) return

  await transaction(async (tx) => {
    for (const release of SEED_RELEASES) {
      await createRelease(release, tx)
    }
  })

  console.log(`seed: ${SEED_RELEASES.length} discos cargados`)
}
