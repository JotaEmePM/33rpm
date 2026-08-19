import type { ReactNode } from "react"

export function SectionHeading({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-paper pb-3">
      <h2 className="font-display text-3xl uppercase sm:text-4xl">{title}</h2>
      {aside ? <div className="label text-muted">{aside}</div> : null}
    </div>
  )
}
