import type { Track } from "../../types"

export function Tracklist({ tracks }: { tracks: Track[] }) {
  return (
    <section>
      <h2 className="font-display text-2xl uppercase">Tracklist</h2>
      <ol className="mt-3">
        {tracks.map((track) => (
          <li
            key={track.position}
            className="flex items-baseline gap-4 border-t border-ash py-2 text-sm"
          >
            <span className="label w-8 shrink-0 text-volt">{track.position}</span>
            <span className="flex-1">{track.title}</span>
            <span className="text-muted tabular-nums">{track.duration}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
