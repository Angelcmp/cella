"use client";

import {
  FileText,
  Presentation,
  File,
  Loader2,
  RotateCcw,
  Check,
} from "lucide-react";
import type { ZenDocument } from "./store";
import { cn } from "@/lib/utils";

const DOT_COLORS: Record<string, string> = {
  indexed: "var(--zen-dot-indexed)",
  processing: "var(--zen-dot-processing)",
  pending: "var(--zen-dot-pending)",
  failed: "var(--zen-dot-failed)",
};

const STATUS_LABEL: Record<string, string> = {
  indexed: "Indexado",
  processing: "Procesando",
  pending: "En cola",
  failed: "Error",
};

function typeIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pptx" || ext === "ppt") return Presentation;
  if (ext === "txt" || ext === "md") return File;
  return FileText;
}

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
  const Icon = typeIcon(doc.filename);
  const isProcessing = doc.status === "pending" || doc.status === "processing";
  const dotColor = DOT_COLORS[doc.status] ?? "var(--zen-dot-indexed)";

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-md border transition-colors cursor-pointer",
        active
          ? "bg-[var(--secondary-container)] text-[var(--on-secondary-container)] border-[var(--primary-fixed)]/30"
          : "border-transparent text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)]"
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
        title={STATUS_LABEL[doc.status] ?? doc.status}
      />

      <span className="w-6 h-6 rounded-md bg-[var(--surface-container-highest)]/60 flex items-center justify-center shrink-0">
        <Icon className="w-3 h-3 text-[var(--on-surface-variant)]" />
      </span>

      <span className="flex-1 min-w-0">
        <span className="block truncate font-label-mono text-(length:--zen-fs-secondary) leading-tight">
          {doc.title}
        </span>
        {isProcessing ? (
          <span className="flex items-center gap-1 font-label-mono text-(length:--zen-fs-label) text-[var(--primary-fixed)]">
            <Loader2 className="w-2 h-2 animate-spin" />
            {doc.status === "pending" ? "En cola" : "Procesando"}
          </span>
        ) : (
          <span className="font-label-mono text-(length:--zen-fs-label) text-[var(--on-surface-variant)]/50">
            {doc.pages > 0 ? `${doc.pages} pág.` : STATUS_LABEL[doc.status] ?? doc.status}
          </span>
        )}
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
      </div>
    </div>
  );
}
