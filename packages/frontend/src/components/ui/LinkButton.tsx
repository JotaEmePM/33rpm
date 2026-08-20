import type { ReactNode } from "react"
import { Link } from "react-router"
import { type ButtonSize, type ButtonVariant, buttonClasses } from "../../lib/button-classes"

interface LinkButtonProps {
  to: string
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: ReactNode
}

export function LinkButton({
  to,
  variant = "volt",
  size = "md",
  className = "",
  children,
}: LinkButtonProps) {
  return (
    <Link to={to} viewTransition className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  )
}
