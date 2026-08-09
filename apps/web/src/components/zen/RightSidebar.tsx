"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Sparkles,
  FileText,
  ListChecks,
  BookOpen,
  HelpCircle,
  StickyNote,
  Network,
  RefreshCw,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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

interface ToolCard {
  id: RightTab;
  title: string;
  icon: React.ReactNode;
  color: {
    hover: string;
    active: string;
  };
}

const toolBase =
  "bg-white/40 backdrop-blur-md shadow-[0_4px_16px_rgba(22,82,65,0.10)] text-[var(--on-surface)]";

const tools: ToolCard[] = [
  {
    id: "document",
    title: "Visor Documento",
    icon: <FileText className="w-4 h-4" />,
    color: {
      hover: "hover:bg-red-100 hover:text-red-700 hover:shadow-[0_4px_16px_rgba(239,68,68,0.25)]",
      active: "bg-red-100 text-red-700 shadow-[0_4px_16px_rgba(239,68,68,0.25)]",
    },
  },
  {
    id: "summary",
    title: "Resumen Ejecutivo",
    icon: <Sparkles className="w-4 h-4" />,
    color: {
      hover: "hover:bg-green-100 hover:text-green-700 hover:shadow-[0_4px_16px_rgba(34,197,94,0.25)]",
      active: "bg-green-100 text-green-700 shadow-[0_4px_16px_rgba(34,197,94,0.25)]",
    },
  },
  {
    id: "mindmap",
    title: "Mapping Conceptual",
    icon: <Network className="w-4 h-4" />,
    color: {
      hover: "hover:bg-blue-100 hover:text-blue-700 hover:shadow-[0_4px_16px_rgba(59,130,246,0.25)]",
      active: "bg-blue-100 text-blue-700 shadow-[0_4px_16px_rgba(59,130,246,0.25)]",
    },
  },
  {
    id: "quiz",
    title: "Quiz Module",
    icon: <ListChecks className="w-4 h-4" />,
    color: {
      hover: "hover:bg-yellow-100 hover:text-yellow-700 hover:shadow-[0_4px_16px_rgba(234,179,8,0.25)]",
      active: "bg-yellow-100 text-yellow-700 shadow-[0_4px_16px_rgba(234,179,8,0.25)]",
    },
  },
  {
    id: "guide",
    title: "Guía Estudio",
    icon: <BookOpen className="w-4 h-4" />,
    color: {
      hover: "hover:bg-purple-100 hover:text-purple-700 hover:shadow-[0_4px_16px_rgba(168,85,247,0.25)]",
      active: "bg-purple-100 text-purple-700 shadow-[0_4px_16px_rgba(168,85,247,0.25)]",
    },
  },
  {
    id: "faq",
    title: "FAQ Auto",
    icon: <HelpCircle className="w-4 h-4" />,
    color: {
      hover: "hover:bg-pink-100 hover:text-pink-700 hover:shadow-[0_4px_16px_rgba(236,72,153,0.25)]",
      active: "bg-pink-100 text-pink-700 shadow-[0_4px_16px_rgba(236,72,153,0.25)]",
    },
  },
  {
    id: "notes",
    title: "Notas Rápidas",
    icon: <StickyNote className="w-4 h-4" />,
    color: {
      hover: "hover:bg-gray-100 hover:text-gray-700 hover:shadow-[0_4px_16px_rgba(75,85,99,0.25)]",
      active: "bg-gray-100 text-gray-700 shadow-[0_4px_16px_rgba(75,85,99,0.25)]",
    },
  },
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

export default function RightSidebar({
  collapsed = false,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { activeDocumentId, documents, rightTab, setRightTab } = useZenStore();
  const activeDoc = documents.find((d) => d.id === activeDocumentId);

  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [mindmapCode, setMindmapCode] = useState<string>("");
  const [loadingMindmap, setLoadingMindmap] = useState(false);
  const [mindmapView, setMindmapView] = useState<"concept" | "mermaid">("concept");
  const [summaryKey, setSummaryKey] = useState(0);

  // Load persisted mindmap when document changes
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

  const renderToolContent = () => {
    if (!activeDoc) {
      return (
        <div className="h-full flex items-center justify-center p-4">
          <div className="text-center max-w-[180px] space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--surface-container-high)] mx-auto flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-[var(--primary-fixed)]" />
            </div>
            <p className="font-label-mono text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)]/60 leading-relaxed">
              Selecciona una fuente para activar los procesos de Studio.
            </p>
          </div>
        </div>
      );
    }

    switch (rightTab) {
      case "document":
        return <DocumentViewer documentId={activeDoc.id} />;

      case "summary":
        return (
          <div key={summaryKey} className="p-3">
            <DocumentSummary documentId={activeDoc.id} documentTitle={activeDoc.title} />
          </div>
        );

      case "mindmap":
        if (loadingMindmap) {
          return (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-5 h-5 text-[var(--primary-fixed)] animate-spin" />
            </div>
          );
        }

        if (!mindmapCode) {
          return (
            <div className="p-6 text-center space-y-4">
              <Network className="w-8 h-8 mx-auto text-[var(--on-surface-variant)]/60" />
              <p className="font-label-mono text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)]">
                Genera un mapa mental interactivo del documento.
              </p>
              <button
                onClick={generateMindmap}
                disabled={loadingMindmap}
                className="px-3 py-1.5 rounded-lg bg-[var(--primary-fixed)] text-white text-(length:--zen-fs-secondary) font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loadingMindmap ? "Generando..." : "Generar mapa"}
              </button>
            </div>
          );
        }

        return (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[var(--outline-variant)]/20">
              <button
                onClick={() => setMindmapView("concept")}
                className={`px-1.5 py-0.5 rounded font-label-mono text-(length:--zen-fs-label) uppercase transition-colors ${
                  mindmapView === "concept"
                    ? "bg-[var(--primary)]/10 text-[var(--primary-fixed)]"
                    : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
                }`}
              >
                Interactivo
              </button>
              <button
                onClick={() => setMindmapView("mermaid")}
                className={`px-1.5 py-0.5 rounded font-label-mono text-(length:--zen-fs-label) uppercase transition-colors ${
                  mindmapView === "mermaid"
                    ? "bg-[var(--primary)]/10 text-[var(--primary-fixed)]"
                    : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
                }`}
              >
                Diagrama
              </button>
              <div className="flex-1" />
              <button
                onClick={generateMindmap}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded font-label-mono text-(length:--zen-fs-label) text-[var(--on-surface-variant)] hover:text-[var(--primary-fixed)] transition-colors"
              >
                <RefreshCw className="w-2.5 h-2.5" />
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
              <Loader2 className="w-5 h-5 text-[var(--primary-fixed)] animate-spin" />
            </div>
          );
        }

        if (!quizData || quizData.error) {
          return (
            <div className="p-6 text-center space-y-4">
              <HelpCircle className="w-8 h-8 mx-auto text-[var(--on-surface-variant)]/60" />
              <p className="font-label-mono text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)]">
                Genera preguntas para evaluar tu comprensión del documento.
              </p>
              <button
                onClick={generateQuiz}
                disabled={loadingQuiz}
                className="px-3 py-1.5 rounded-lg bg-[var(--primary-fixed)] text-white text-(length:--zen-fs-secondary) font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loadingQuiz ? "Generando..." : "Generar quiz"}
              </button>
            </div>
          );
        }

        return (
          <div className="p-3 space-y-3">
            {quizData.questions?.map((q: QuizQuestion, i: number) => (
              <div key={i} className="p-2.5 rounded-lg bg-[var(--surface-container-high)]/50 border border-[var(--outline-variant)]/20">
                <p className="font-label-mono text-(length:--zen-fs-secondary) text-[var(--on-surface)] mb-1.5">
                  {i + 1}. {q.question}
                </p>
                <div className="space-y-0.5">
                  {q.options?.map((opt: string, j: number) => (
                    <div
                      key={j}
                      className="font-label-mono text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] px-2 py-0.5 rounded hover:bg-[var(--surface-container-high)] cursor-pointer transition-colors"
                    >
                      {String.fromCharCode(65 + j)}) {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={generateQuiz}
              className="w-full py-1 font-label-mono text-(length:--zen-fs-label) uppercase tracking-[0.12em] text-[var(--on-surface-variant)]/60 hover:text-[var(--primary-fixed)] transition-colors"
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
      {/* Studio header */}
      <div
        className={`p-4 border-b border-[var(--outline-variant)]/10 flex items-center ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!collapsed && (
          <span className="font-label-mono text-(length:--zen-fs-heading) uppercase tracking-[0.15em] text-[var(--tertiary-fixed)]">
            Studio
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[var(--on-surface-variant)]/60 hover:text-[var(--primary-fixed)] hover:bg-[var(--surface-container-high)] transition-colors cursor-pointer"
          title={collapsed ? "Expandir aside" : "Reducir aside"}
        >
          {collapsed ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {collapsed ? (
        /* Icon rail (collapsed) */
        <div className="p-2 flex flex-col items-center gap-1.5 flex-1 overflow-y-auto">
          {tools.map((tool) => {
            const isActive = rightTab === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setRightTab(tool.id)}
                title={tool.title}
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 cursor-pointer shrink-0 ${toolBase} ${
                  isActive ? tool.color.active : tool.color.hover
                }`}
              >
                {tool.icon}
              </button>
            );
          })}
        </div>
      ) : activeDoc ? (
        /* Reduced: compact tool bar (gives content full visibility) */
        <div className="px-2 py-1.5 flex items-center gap-1 overflow-x-auto border-b border-[var(--outline-variant)]/10">
          {tools.map((tool) => {
            const isActive = rightTab === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setRightTab(tool.id)}
                title={tool.title}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer shrink-0 ${toolBase} ${
                  isActive ? tool.color.active : tool.color.hover
                }`}
              >
                {tool.icon}
              </button>
            );
          })}
        </div>
      ) : (
        /* Tool cards grid */
        <div className="p-3">
          <div className="grid grid-cols-3 gap-2 justify-items-center">
            {tools.map((tool) => {
              const isActive = rightTab === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setRightTab(tool.id)}
                  className={`flex flex-col items-center justify-center gap-1 w-full max-w-[150px] p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${toolBase} ${
                    isActive ? tool.color.active : tool.color.hover
                  }`}
                >
                  {tool.icon}
                  <h4 className="font-label-mono text-(length:--zen-fs-body) text-center truncate">
                    {tool.title}
                  </h4>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active tool content */}
      {!collapsed && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto">{renderToolContent()}</div>
        </div>
      )}
    </div>
  );
}
