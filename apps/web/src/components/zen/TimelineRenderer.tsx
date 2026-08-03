"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: "pending", label: "En cola" },
  { id: "processing", label: "Procesando" },
  { id: "indexed", label: "Listo" },
] as const;

type Status = (typeof STEPS)[number]["id"] | "failed";

interface TimelineRendererProps {
  status: Status;
  title?: string;
}

export default function TimelineRenderer({ status, title }: TimelineRendererProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === status);
  const failed = status === "failed";

  return (
    <div className="w-full max-w-sm mx-auto">
      {title && (
        <p className="text-xs text-[var(--text-secondary)] text-center mb-5 truncate px-2">
          {title}
        </p>
      )}
      <div className="relative">
        <div
          className={cn(
            "absolute left-[16.66%] right-[16.66%] top-[11px] h-0.5",
            failed
              ? "bg-red-500/30"
              : "bg-[var(--border-subtle)]"
          )}
        />
        <div
          className={cn(
            "absolute left-[16.66%] top-[11px] h-0.5 transition-all duration-700",
            failed
              ? "w-0 bg-red-500"
              : "bg-[var(--accent-primary)]",
            currentIndex > 0 && !failed && "w-[33.33%]",
            currentIndex > 1 && !failed && "w-[66.66%]"
          )}
        />
        <div className="relative flex justify-between">
          {STEPS.map((step, i) => {
            const done = !failed && currentIndex > i;
            const active = failed ? false : currentIndex === i;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={cn(
                    "w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors duration-300",
                    failed
                      ? "border-red-500/40 text-red-500 bg-red-500/5"
                      : done
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                        : active
                          ? "border-[var(--accent-primary)] bg-[var(--bg-surface)] text-[var(--accent-primary)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]"
                  )}
                >
                  {failed ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  ) : done ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : active ? (
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/50" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] transition-colors",
                    failed
                      ? "text-red-500"
                      : done || active
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-muted)]"
                  )}
                >
                  {failed && i === 1 ? "Error" : step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
