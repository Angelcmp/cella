"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useZenStore } from "./store";
import type { RightTab } from "./store";
import DocumentViewer from "@/components/DocumentViewer";
import { DocumentSummary } from "@/components/DocumentSummary";
import ConceptMapViewer from "@/components/ConceptMapViewer";
import MermaidRenderer from "@/components/MermaidRenderer";
import StudyGuideTab from "./StudyGuideTab";
import FaqTab from "./FaqTab";
import NotesTab from "./NotesTab";
import { withCsrfHeaders } from "@/lib/csrf";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const tabs: { id: RightTab; label: string }[] = [
  { id: "document", label: "Documento" },
  { id: "summary", label: "Resumen" },
  { id: "mindmap", label: "Mapa" },
  { id: "quiz", label: "Quiz" },
  { id: "guide", label: "Guía" },
  { id: "faq", label: "FAQ" },
  { id: "notes", label: "Notas" },
];

interface QuizQuestion {
  question: string;
  options?: string[];
  correct?: string;
}

interface QuizData {
  markdown?: string;
  questions?: QuizQuestion[];
  error?: boolean;
}

export default function RightSidebar() {
  const { activeDocumentId, documents, rightTab, setRightTab } = useZenStore();
  const activeDoc = documents.find((d) => d.id === activeDocumentId);

  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [mindmapCode, setMindmapCode] = useState<string>("");
  const [loadingMindmap, setLoadingMindmap] = useState(false);
  const [mindmapView, setMindmapView] = useState<"concept" | "mermaid">("concept");
  const [summaryKey, setSummaryKey] = useState(0);

  // Load persisted mindmap (auto-generated during indexing) when document changes
  useEffect(() => {
    setQuizData(null);
    setMindmapCode("");
    setSummaryKey((k) => k + 1);

    if (!activeDocumentId) return;

    const loadMindmap = async () => {
      setLoadingMindmap(true);
      try {
        const res = await fetch(
          `${API_URL}/documents/${activeDocumentId}/mindmap`,
          { method: "GET", credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.markdown) setMindmapCode(data.markdown);
        }
      } catch {
        setMindmapCode("");
      } finally {
        setLoadingMindmap(false);
      }
    };

    loadMindmap();
  }, [activeDocumentId]);

  const generateMindmap = async () => {
    if (!activeDocumentId) return;
    setLoadingMindmap(true);
    try {
      const res = await fetch(
        `${API_URL}/documents/${activeDocumentId}/mindmap`,
        {
          method: "POST",
          credentials: "include",
          headers: withCsrfHeaders({ headers: { "Content-Type": "application/json" } }).headers,
          body: JSON.stringify({ detail_level: 2 }),
        }
      );
      const data = await res.json();
      if (data.markdown) setMindmapCode(data.markdown);
    } catch { setMindmapCode(""); } finally { setLoadingMindmap(false); }
  };

  const generateQuiz = async () => {
    if (!activeDocumentId) return;
    setLoadingQuiz(true);
    try {
      const res = await fetch(
        `${API_URL}/documents/${activeDocumentId}/quiz`,
        {
          method: "POST",
          credentials: "include",
          headers: withCsrfHeaders({ headers: { "Content-Type": "application/json" } }).headers,
          body: JSON.stringify({}),
        }
      );
      const data = await res.json();
      setQuizData(data);
    } catch { setQuizData({ error: true }); } finally { setLoadingQuiz(false); }
  };

  const renderTabContent = () => {
    if (!activeDoc) {
      return (
        <div className="p-6 text-center text-sm text-[var(--text-muted)]">
          Selecciona un documento
        </div>
      );
    }

    switch (rightTab) {
      case "document":
        return <DocumentViewer documentId={activeDoc.id} />;

      case "summary":
        return (
          <div key={summaryKey} className="p-4">
            <DocumentSummary documentId={activeDoc.id} documentTitle={activeDoc.title} />
          </div>
        );

      case "mindmap":
        if (loadingMindmap) {
          return (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-5 h-5 text-[var(--accent-primary)] animate-spin" />
            </div>
          );
        }

        if (!mindmapCode) {
          return (
            <div className="p-6 text-center space-y-4">
              <Sparkles className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-secondary)]">
                Genera un mapa mental interactivo del documento
              </p>
              <button
                onClick={generateMindmap}
                className="px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Generar mapa mental
              </button>
            </div>
          );
        }

        return (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-muted)]">
                {activeDoc.title}
              </span>
              <div className="flex-1" />
              <button
                onClick={() => setMindmapView("concept")}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  mindmapView === "concept"
                    ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                Interactivo
              </button>
              <button
                onClick={() => setMindmapView("mermaid")}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  mindmapView === "mermaid"
                    ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                Diagrama
              </button>
              <button
                onClick={generateMindmap}
                className="px-2 py-0.5 rounded text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Regenerar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {mindmapView === "concept" ? (
                <ConceptMapViewer code={mindmapCode} height="100%" />
              ) : (
                <MermaidRenderer code={mindmapCode} />
              )}
            </div>
          </div>
        );

      case "quiz":
        if (loadingQuiz) {
          return (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-5 h-5 text-[var(--accent-primary)] animate-spin" />
            </div>
          );
        }

        if (!quizData || quizData.error) {
          return (
            <div className="p-6 text-center space-y-4">
              <p className="text-xs text-[var(--text-secondary)]">
                Genera un quiz para evaluar comprensión
              </p>
              <button
                onClick={generateQuiz}
                className="px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Generar Quiz
              </button>
            </div>
          );
        }

        return (
          <div className="p-4 space-y-4">
            {quizData.questions?.map((q: QuizQuestion, i: number) => (
              <div key={i} className="p-3 rounded-xl border border-[var(--border-subtle)]">
                <p className="text-xs font-medium text-[var(--text-primary)] mb-2">
                  {i + 1}. {q.question}
                </p>
                <div className="space-y-1">
                  {q.options?.map((opt: string, j: number) => (
                    <div
                      key={j}
                      className="text-[11px] text-[var(--text-secondary)] px-2 py-1 rounded hover:bg-[var(--bg-muted)] cursor-pointer transition-colors"
                    >
                      {String.fromCharCode(65 + j)}) {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={generateQuiz}
              className="w-full py-1.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Regenerar quiz
            </button>
          </div>
        );

      case "guide":
        return <StudyGuideTab documentId={activeDoc.id} documentTitle={activeDoc.title} />;

      case "faq":
        return <FaqTab documentId={activeDoc.id} />;

      case "notes":
        return <NotesTab documentId={activeDoc.id} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-[var(--border-subtle)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRightTab(tab.id)}
            className={`flex-1 px-2 py-2.5 text-[11px] font-medium transition-colors border-b-2 ${
              rightTab === tab.id
                ? "border-[var(--accent-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">{renderTabContent()}</div>
    </div>
  );
}
