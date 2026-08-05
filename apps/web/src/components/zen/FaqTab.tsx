"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Sparkles, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { withCsrfHeaders } from "@/lib/csrf";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FaqItem {
  question?: string;
  answer?: string;
  pages?: string;
}

interface FaqResponse {
  faqs?: FaqItem[];
  markdown?: string;
  success?: boolean;
}

export default function FaqTab({ documentId }: { documentId: string }) {
  const [data, setData] = useState<FaqResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const loadFaqs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/documents/${documentId}/faq`, { credentials: "include" });
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    setData(null);
    setLoading(true);
    loadFaqs();
  }, [documentId, loadFaqs]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/documents/${documentId}/faq`, {
        method: "POST",
        credentials: "include",
        headers: withCsrfHeaders({ headers: { "Content-Type": "application/json" } }).headers,
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.detail || "Error al generar las preguntas frecuentes");
        return;
      }
      const json = await res.json();
      setData(json);
      toast.success("Preguntas frecuentes generadas");
    } catch {
      toast.error("Error de conexión al generar las preguntas frecuentes");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-5 h-5 text-[var(--accent-primary)] animate-spin" />
      </div>
    );
  }

  const faqs = data?.faqs;

  if (!faqs || faqs.length === 0) {
    return (
      <div className="p-6 text-center space-y-4">
        <HelpCircle className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
        <p className="text-xs text-[var(--text-secondary)]">
          Genera preguntas frecuentes con respuestas y páginas de referencia
        </p>
        <button
          onClick={generate}
          disabled={generating}
          className="px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {generating ? "Generando..." : "Generar FAQ"}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          Preguntas frecuentes
        </h3>
        <button
          onClick={generate}
          disabled={generating}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {generating ? "..." : "Regenerar"}
        </button>
      </div>

      {faqs.map((faq, i) => (
        <div key={i} className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-[var(--bg-muted)]/60 transition-colors"
          >
            <span className="text-[11px] font-medium text-[var(--text-primary)]">
              {i + 1}. {faq.question}
            </span>
            <span className="text-[var(--text-muted)] text-[10px] shrink-0">
              {openIndex === i ? "−" : "+"}
            </span>
          </button>
          {openIndex === i && (
            <div className="px-3 pb-3">
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{faq.answer}</p>
              {faq.pages && (
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5">Páginas: {faq.pages}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
