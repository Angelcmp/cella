"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Sparkles, BookOpen, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { withCsrfHeaders } from "@/lib/csrf";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface GuideSection {
  title?: string;
  summary?: string;
  pages?: string;
  key_points?: string[];
  examples?: string[];
}

interface ReviewQuestion {
  question?: string;
  pages?: string;
}

interface GuideData {
  title?: string;
  objectives?: string[];
  key_concepts?: { term?: string; definition?: string; pages?: string }[];
  sections?: GuideSection[];
  checkpoints?: string[];
  review_questions?: ReviewQuestion[];
  estimated_time_minutes?: number;
}

interface GuideResponse {
  guide?: GuideData;
  markdown?: string;
  success?: boolean;
}

export default function StudyGuideTab({ documentId, documentTitle }: { documentId: string; documentTitle: string }) {
  const [data, setData] = useState<GuideResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadGuide = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/documents/${documentId}/study-guide`, { credentials: "include" });
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
    loadGuide();
  }, [documentId, loadGuide]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/documents/${documentId}/study-guide`, {
        method: "POST",
        credentials: "include",
        headers: withCsrfHeaders({ headers: { "Content-Type": "application/json" } }).headers,
        body: JSON.stringify({ output_format: "json" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.detail || "Error al generar la guía de estudio");
        return;
      }
      const json = await res.json();
      setData(json);
      toast.success("Guía de estudio generada");
    } catch {
      toast.error("Error de conexión al generar la guía");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-5 h-5 text-[var(--primary-fixed)] animate-spin" />
      </div>
    );
  }

  const guide = data?.guide;

  if (!guide) {
    return (
      <div className="p-6 text-center space-y-4">
        <BookOpen className="w-8 h-8 mx-auto text-[var(--on-surface-variant)]/60" />
        <p className="zen-text-body zen-read-text">
          Genera una guía de estudio estructurada para prepararte sobre este documento
        </p>
        <button
          onClick={generate}
          disabled={generating}
          className="px-3 py-1.5 rounded-lg bg-[var(--primary-fixed)] text-white text-(length:--zen-fs-secondary) font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {generating ? "Generando..." : "Generar guía de estudio"}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="zen-text-heading zen-read-text flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--primary-fixed)]" />
          {guide.title || `Guía de estudio — ${documentTitle}`}
        </h3>
        <button
          onClick={generate}
          disabled={generating}
          className="p-1.5 rounded-lg text-[var(--on-surface-variant)]/60 hover:text-[var(--primary-fixed)] hover:bg-[var(--surface-container-high)] transition-colors"
          title="Regenerar"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
      </div>

      {guide.objectives && guide.objectives.length > 0 && (
        <div className="p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] bg-[var(--surface-container-high)]/30">
          <p className="text-(length:--zen-fs-label) uppercase tracking-wider text-[var(--on-surface-variant)]/60 mb-2 font-medium">Objetivos</p>
          <ul className="space-y-1">
            {guide.objectives.map((o, i) => (
              <li key={i} className="zen-text-body zen-read-text flex gap-1.5">
                <span className="text-[var(--primary-fixed)]">•</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {guide.key_concepts && guide.key_concepts.length > 0 && (
        <div className="p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] bg-[var(--surface-container-high)]/30">
          <p className="text-(length:--zen-fs-label) uppercase tracking-wider text-[var(--on-surface-variant)]/60 mb-2 font-medium">Conceptos clave</p>
          <div className="space-y-2">
            {guide.key_concepts.map((c, i) => (
              <div key={i} className="zen-text-body">
                <span className="font-medium zen-read-text">{c.term}</span>
                {c.pages && <span className="text-(length:--zen-fs-label) text-[var(--on-surface-variant)]/60 ml-1">[{c.pages}]</span>}
                <p className="zen-text-body zen-read-text">{c.definition}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {guide.sections && guide.sections.length > 0 && (
        <div className="space-y-3">
          {guide.sections.map((s, i) => (
            <div key={i} className="p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] bg-[var(--surface-container-high)]/30">
              <p className="zen-text-heading zen-read-text">
                {s.title}
                {s.pages && <span className="text-(length:--zen-fs-label) text-[var(--on-surface-variant)]/60 ml-1">[{s.pages}]</span>}
              </p>
              {s.summary && <p className="zen-text-body zen-read-text mt-1">{s.summary}</p>}
              {s.key_points && s.key_points.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {s.key_points.map((kp, j) => (
                    <li key={j} className="zen-text-body zen-read-text flex gap-1.5">
                      <span className="text-[var(--primary-fixed)]">•</span>
                      <span>{kp}</span>
                    </li>
                  ))}
                </ul>
              )}
              {s.examples && s.examples.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {s.examples.map((ex, j) => (
                    <li key={j} className="zen-text-body text-[var(--on-surface-variant)] italic flex gap-1.5">
                      <span className="not-italic text-[var(--on-surface-variant)]/60">▸</span>
                      <span>{ex}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {guide.checkpoints && guide.checkpoints.length > 0 && (
        <div className="p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] bg-[var(--surface-container-high)]/30">
          <p className="text-(length:--zen-fs-label) uppercase tracking-wider text-[var(--on-surface-variant)]/60 mb-2 font-medium">Checkpoints</p>
          <ul className="space-y-1">
            {guide.checkpoints.map((c, i) => (
              <li key={i} className="zen-text-body zen-read-text flex gap-1.5">
                <span className="text-[var(--primary-fixed)]">✓</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {guide.review_questions && guide.review_questions.length > 0 && (
        <div className="p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] bg-[var(--surface-container-high)]/30">
          <p className="text-(length:--zen-fs-label) uppercase tracking-wider text-[var(--on-surface-variant)]/60 mb-2 font-medium">Preguntas de repaso</p>
          <ul className="space-y-1">
            {guide.review_questions.map((q, i) => (
              <li key={i} className="zen-text-body zen-read-text flex gap-1.5">
                <span className="text-[var(--primary-fixed)]">{i + 1}.</span>
                <span>
                  {q.question}
                  {q.pages && <span className="text-(length:--zen-fs-label) text-[var(--on-surface-variant)]/60 ml-1">[{q.pages}]</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {guide.estimated_time_minutes && (
        <p className="text-(length:--zen-fs-label) text-[var(--on-surface-variant)]/60">
          ⏱ Tiempo estimado de estudio: {guide.estimated_time_minutes} min
        </p>
      )}
    </div>
  );
}
