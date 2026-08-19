import type { Release } from "../../types"

export function ReleaseMeta({ release }: { release: Release }) {
  const rows = [
    { label: "Sello", value: release.label },
    { label: "Año", value: String(release.year) },
    { label: "Formato", value: release.format },
    { label: "Estado", value: release.condition },
    { label: "Género", value: release.genre },
  ]

  return (
    <dl className="grid grid-cols-2 gap-px bg-ash">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-1 bg-ink p-3">
          <dt className="label text-muted">{row.label}</dt>
          <dd className="text-sm">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
