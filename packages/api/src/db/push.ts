import { bootstrapDatabase } from "./bootstrap.js"
import { client } from "./connection.js"

/**
 * Aplica el esquema y siembra el catálogo en la base a la que apunten las
 * variables de entorno. Reemplaza al `migrate()` de arranque cuando el API
 * corre en Vercel, donde no conviene migrar en cada arranque en frío.
 */
await bootstrapDatabase()
console.log("esquema aplicado y catálogo verificado")
client.close()
