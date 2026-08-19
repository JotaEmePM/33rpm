import { formatPrice } from "../../lib/format"

export function Price({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  }
  return <span className={`font-display text-volt ${sizes[size]}`}>{formatPrice(value)}</span>
}
