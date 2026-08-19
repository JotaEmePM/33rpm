import type { ButtonHTMLAttributes } from "react"
import { type ButtonSize, type ButtonVariant, buttonClasses } from "../../lib/button-classes"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  variant = "volt",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />
}
