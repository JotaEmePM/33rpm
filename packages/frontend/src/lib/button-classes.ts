export type ButtonVariant = "volt" | "outline" | "solid" | "ghost"
export type ButtonSize = "sm" | "md" | "lg"

const BASE =
  "inline-flex items-center justify-center gap-2 label border-2 transition-colors disabled:opacity-40 disabled:pointer-events-none"

const VARIANTS: Record<ButtonVariant, string> = {
  volt: "bg-volt text-ink border-volt hover:bg-paper hover:border-paper",
  outline: "bg-transparent text-paper border-paper hover:bg-paper hover:text-ink",
  solid: "bg-paper text-ink border-paper hover:bg-volt hover:border-volt",
  ghost: "bg-transparent text-paper border-transparent hover:border-volt hover:text-volt",
}

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-4",
  md: "min-h-12 px-6",
  lg: "min-h-14 px-8 text-xs",
}

export function buttonClasses(
  variant: ButtonVariant = "volt",
  size: ButtonSize = "md",
  extra = "",
): string {
  return [BASE, VARIANTS[variant], SIZES[size], extra].filter(Boolean).join(" ")
}
