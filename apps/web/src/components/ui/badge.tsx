import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--radius-pill)] border px-3 py-1 text-[0.75rem] font-semibold uppercase tracking-wide w-fit whitespace-nowrap shrink-0 gap-1 transition-colors duration-200",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--accent-primary)] text-[var(--primary-foreground)]",
        secondary:
          "border-transparent bg-[var(--bg-muted)] text-[var(--text-primary)]",
        destructive:
          "border-transparent bg-destructive text-white",
        outline:
          "border-[var(--border-subtle)] text-[var(--text-secondary)]",
        glow:
          "border-0 bg-[var(--gradient-zen-glow)] text-[var(--primary-foreground)] shadow-glow",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
