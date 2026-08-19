export function ArrowRightIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 12h15" strokeLinecap="square" />
      <path d="M13 6l6 6-6 6" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  )
}
