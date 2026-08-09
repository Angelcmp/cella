"use client";

import { Loader2, RotateCcw, Check } from "lucide-react";
import type { ZenDocument } from "./store";
import { cn } from "@/lib/utils";

const DOT_COLORS: Record<string, string> = {
  indexed: "var(--zen-dot-indexed)",
  processing: "var(--zen-dot-processing)",
  pending: "var(--zen-dot-pending)",
  failed: "var(--zen-dot-failed)",
};

interface SourceCardProps {
  doc: ZenDocument;
  active: boolean;
  chatChecked: boolean;
  onSelect: () => void;
  onToggleChat: () => void;
  onReprocess?: () => void;
}

export default function SourceCard({
  doc,
  active,
  chatChecked,
  onSelect,
  onToggleChat,
  onReprocess,
}: SourceCardProps) {
  const isProcessing = doc.status === "pending" || doc.status === "processing";
  const dotColor = DOT_COLORS[doc.status] ?? "var(--zen-dot-indexed)";

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)]",
        active
          ? "bg-[var(--secondary-container)] text-[var(--on-secondary-container)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)]"
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
        title={doc.status}
      />

      <span className="flex-1 min-w-0">
        <span className="block truncate font-label-mono [font-size:10px] leading-tight">
          {doc.title}
        </span>
      </span>

      <div className="flex items-center gap-0.5 shrink-0">
        {onReprocess && doc.status === "failed" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReprocess();
            }}
            className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-[var(--on-surface-variant)] hover:text-[var(--primary-fixed)]"
            title="Reprocesar documento"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        )}

        {isProcessing ? (
          <Loader2 className="w-2.5 h-2.5 animate-spin text-[var(--primary-fixed)]" />
        ) : (
          <label
            onClick={(e) => e.stopPropagation()}
            className="flex items-center cursor-pointer"
            title="Incluir en el chat"
          >
            <input
              type="checkbox"
              checked={chatChecked}
              onChange={onToggleChat}
              className="sr-only"
            />
            <span
              className={cn(
                "w-3 h-3 rounded border flex items-center justify-center transition-colors",
                chatChecked
                  ? "bg-[var(--primary-fixed)] border-[var(--primary-fixed)]"
                  : "border-[var(--outline-variant)]"
              )}
            >
              {chatChecked && <Check className="w-2 h-2 text-[var(--on-primary-container)]" />}
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
