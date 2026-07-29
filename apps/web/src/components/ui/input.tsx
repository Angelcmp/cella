import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-11 w-full min-w-0 rounded-[var(--radius-base)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 text-base text-[var(--text-primary)] transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[var(--accent-primary)] focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
