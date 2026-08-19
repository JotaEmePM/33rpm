export function CheckIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M4 12.5l5 5L20 6.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  )
}
