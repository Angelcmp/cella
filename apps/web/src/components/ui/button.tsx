import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-base)] px-5 py-2.5 text-base font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:h-4 [&_svg:not([class*='size-'])]:w-4 shrink-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent-primary)] text-[var(--primary-foreground)] shadow-soft hover:bg-[var(--accent-strong)] hover:shadow-glow",
        secondary:
          "bg-[var(--bg-muted)] text-[var(--text-primary)] shadow-card hover:bg-[var(--bg-muted)]/90",
        outline:
          "border border-[var(--border-subtle)] bg-transparent text-[var(--text-primary)] shadow-none hover:bg-[var(--bg-muted)]/70",
        ghost:
          "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-muted)]/60",
        link: "text-[var(--accent-primary)] underline-offset-4 hover:underline hover:text-[var(--accent-highlight)]",
        gradient:
          "bg-[var(--gradient-zen-glow)] text-white shadow-glow hover:opacity-95",
        destructive:
          "bg-destructive text-white shadow-soft hover:bg-destructive/90 focus-visible:ring-destructive/20",
      },
      size: {
        sm: "px-3 py-1.5 text-sm rounded-[10px]",
        default: "px-5 py-2.5",
        lg: "px-6 py-3 text-lg rounded-[var(--radius-lg)]",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
