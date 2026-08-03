"use client";

import { useEffect, useState } from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingBlockProps {
  content: string;
  startedAt: number;
  streaming: boolean;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function ThinkingBlock({
  content,
  startedAt,
  streaming,
}: ThinkingBlockProps) {
  const [open, setOpen] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!streaming) {
      setElapsed(Date.now() - startedAt);
      return;
    }
    const tick = () => setElapsed(Date.now() - startedAt);
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [startedAt, streaming]);

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)]/60 overflow-hidden mb-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
        <span className="text-[13px] font-medium">
          {streaming ? "Pensando…" : "Pensó durante"}{" "}
          <span
            className={cn(
              "tabular-nums",
              streaming && "text-[var(--accent-primary)]"
            )}
          >
            {formatElapsed(elapsed)}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 ml-auto transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && content.trim() && (
        <div className="px-3 pb-3 text-[13px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}
