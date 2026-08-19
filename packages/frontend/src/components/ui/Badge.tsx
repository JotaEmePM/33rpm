import type { ReactNode } from "react"

type BadgeTone = "volt" | "paper" | "outline"

const TONES: Record<BadgeTone, string> = {
  volt: "bg-volt text-ink",
  paper: "bg-paper text-ink",
  outline: "border border-steel text-muted",
}

export function Badge({ tone = "outline", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`label inline-block px-2 py-1 ${TONES[tone]}`}>{children}</span>
}
