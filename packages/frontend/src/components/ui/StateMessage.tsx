export function LoadingState({ label = "Cargando" }: { label?: string }) {
  return (
    <p className="label border-2 border-ash p-10 text-center text-muted" aria-live="polite">
      {label}…
    </p>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 border-2 border-volt p-6" role="alert">
      <p className="font-display text-2xl uppercase text-volt">Algo falló</p>
      <p className="text-sm text-muted">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="label min-h-11 border-2 border-paper px-4 transition-colors hover:bg-paper hover:text-ink"
        >
          Reintentar
        </button>
      ) : null}
    </div>
  )
}
