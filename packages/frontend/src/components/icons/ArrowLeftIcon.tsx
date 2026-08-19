export function ArrowLeftIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M20 12H5" strokeLinecap="square" />
      <path d="M11 6l-6 6 6 6" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  )
}
