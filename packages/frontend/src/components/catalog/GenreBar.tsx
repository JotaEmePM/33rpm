interface GenreBarProps {
  genres: string[]
  selected: string | null
  onSelect: (genre: string | null) => void
}

export function GenreBar({ genres, selected, onSelect }: GenreBarProps) {
  if (genres.length === 0) return null

  return (
    <div className="flex overflow-x-auto border-y-2 border-paper">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
        className={`label min-h-11 flex-1 whitespace-nowrap border-r border-ash px-4 transition-colors ${
          selected === null ? "bg-volt text-ink" : "text-paper hover:bg-smoke"
        }`}
      >
        Todo
      </button>
      {genres.map((genre) => (
        <button
          key={genre}
          type="button"
          onClick={() => onSelect(genre)}
          aria-pressed={selected === genre}
          className={`label min-h-11 flex-1 whitespace-nowrap border-r border-ash px-4 transition-colors ${
            selected === genre ? "bg-volt text-ink" : "text-paper hover:bg-smoke"
          }`}
        >
          {genre}
        </button>
      ))}
    </div>
  )
}
