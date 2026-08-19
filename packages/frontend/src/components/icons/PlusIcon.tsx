export function PlusIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 5v14" strokeLinecap="square" />
      <path d="M5 12h14" strokeLinecap="square" />
    </svg>
  )
}
