export function HeartIcon({
  className = "size-4",
  filled = false,
}: {
  className?: string
  filled?: boolean
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 20.5 4.2 12.8a4.8 4.8 0 0 1 6.8-6.8l1 1 1-1a4.8 4.8 0 0 1 6.8 6.8Z" />
    </svg>
  )
}
