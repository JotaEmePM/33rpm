export function TrashIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 7h16" strokeLinecap="square" />
      <path d="M9 7V4h6v3" strokeLinecap="square" strokeLinejoin="miter" />
      <path d="M6 7l1 13h10l1-13" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  )
}
