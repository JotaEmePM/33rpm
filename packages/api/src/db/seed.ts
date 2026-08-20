import { countReleases, createRelease } from "../repositories/releases.js"
import { transaction } from "./connection.js"
import { SEED_RELEASES } from "./seed-data.js"

/** Siembra el catálogo inicial sólo si la base está vacía. */
export async function seed(): Promise<void> {
  if ((await countReleases()) > 0) return

  await transaction(async (tx) => {
    for (const [index, release] of SEED_RELEASES.entries()) {
      await createRelease(
        {
          ...release,
          visible: true,
          images: [],
          // Los cuatro primeros llenan la portada y uno va en preventa: sin esto
          // las dos marcas no se verían nunca en una tienda recién sembrada.
          isFeatured: index < 4,
          isPreorder: index === 4,
        },
        tx,
      )
    }
  })

  console.log(`seed: ${SEED_RELEASES.length} discos cargados`)
}
