"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BookOpen, Sparkles, ArrowLeft } from "lucide-react";
import { useZenStore } from "./store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SettingsPopoverProps {
  open: boolean;
  onClose: () => void;
}

interface UsageData {
  plan: string;
  enforced: boolean;
  documents: { used: number; limit: number | null; remaining: number | null };
  chats_per_day: { used: number; limit: number | null; remaining: number | null };
  summaries_per_day: { used: number; limit: number | null; remaining: number | null };
}

const menuItem =
  "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--zen-hover)] transition-colors";

export default function SettingsPopover({ open, onClose }: SettingsPopoverProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const setModelsModalOpen = useZenStore((s) => s.setModelsModalOpen);

  useEffect(() => {
    if (!open) return;
    fetch(`${API_URL}/usage`, { credentials: "include" })
      .then((res) => res.json())
      .then(setUsage)
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const rows = usage
    ? [
        { label: "Documentos", value: usage.documents },
        { label: "Chats", value: usage.chats_per_day },
        { label: "Resúmenes", value: usage.summaries_per_day },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        ref={ref}
        className="absolute bottom-14 left-3 w-60 rounded-xl border border-[var(--zen-line)] bg-[var(--zen-panel)] shadow-[var(--zen-elev-2)] p-1.5 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            onClose();
            setModelsModalOpen(true);
          }}
          className={menuItem}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          Modelos e IA
        </button>

        <Link href="/docs" onClick={onClose} className={menuItem}>
          <BookOpen className="w-4 h-4 shrink-0" />
          Documentación
        </Link>

        <Link href="/" onClick={onClose} className={menuItem}>
          <ArrowLeft className="w-4 h-4 shrink-0" />
          Volver al inicio
        </Link>

        {usage && (
          <div className="mt-1.5 pt-2.5 border-t border-[var(--zen-line)] px-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--on-surface-variant)]/70 mb-2">
              Uso (24h)
            </p>
            <div className="space-y-1">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between text-[12px]">
                  <span className="text-[var(--on-surface-variant)]">{row.label}</span>
                  <span className="tabular-nums font-medium text-[var(--on-surface)]">
                    {row.value.used}
                    {row.value.limit ? `/${row.value.limit}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
