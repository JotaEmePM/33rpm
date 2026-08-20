import type { Release } from "../../types"
import { ProductRow } from "./ProductRow"

const COLUMNS = ["Disco", "Sello", "Formato", "Estado", "Precio", "Stock", ""]

interface ProductTableProps {
  releases: Release[]
  onDelete: (id: string) => void
  onToggleVisible: (release: Release) => void
}

export function ProductTable({ releases, onDelete, onToggleVisible }: ProductTableProps) {
  return (
    <div className="overflow-x-auto border-2 border-ash">
      <table className="w-full min-w-3xl border-collapse text-left">
        <thead>
          <tr className="bg-smoke">
            {COLUMNS.map((column, index) => (
              <th
                key={column || `col-${index}`}
                scope="col"
                className={`label p-3 text-muted ${index >= 4 ? "text-right" : ""}`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {releases.map((release) => (
            <ProductRow
              onToggleVisible={onToggleVisible}
              key={release.id}
              release={release}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
