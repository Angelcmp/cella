"use client";

import { useState } from "react";
import { Loader2, Files, Check, RotateCcw, GraduationCap, SquarePen, Rocket } from "lucide-react";
import { toast } from "sonner";
import { useZenStore, type ZenDocument } from "./store";
import ChatInterface from "@/components/ChatInterface";
import ChatInput from "./ChatInput";
import UploadModal from "./UploadModal";
import TimelineRenderer from "./TimelineRenderer";
import { withCsrfHeaders } from "@/lib/csrf";
import { cn } from "@/lib/utils";

const welcomeChips = [
  {
    icon: GraduationCap,
    title: "Aprender un tema nuevo",
    color: "text-[var(--primary-fixed)]",
    hover: "hover:border-[var(--primary-fixed)]/50 hover:text-[var(--primary)] hover:shadow-[0_0_20px_rgba(42,245,255,0.15)]",
  },
  {
    icon: SquarePen,
    title: "Crear contenido nuevo",
    color: "text-[var(--secondary-fixed)]",
    hover: "hover:border-[var(--secondary-fixed)]/50 hover:text-[var(--secondary-fixed)] hover:shadow-[0_0_20px_rgba(173,204,206,0.15)]",
  },
  {
    icon: Rocket,
    title: "Avanzar en proyecto",
    color: "text-[var(--tertiary-fixed)]",
    hover: "hover:border-[var(--tertiary-fixed)]/50 hover:text-[var(--tertiary-fixed)] hover:shadow-[0_0_20px_rgba(186,235,241,0.15)]",
  },
];

function WelcomeState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col flex-1 items-center justify-center p-8 w-full max-w-3xl mx-auto mt-8 mb-24">
        {/* 3D / Y2K icon accent */}
        <div className="mb-6 relative group cursor-default">
          <div className="absolute inset-0 bg-[var(--primary-container)] blur-2xl opacity-20 rounded-full transition-opacity duration-1000 group-hover:opacity-40" />
          <div className="relative w-12 h-12 flex items-center justify-center rounded-xl bg-[var(--surface-container)]/50 border border-[var(--outline-variant)]/30 backdrop-blur-xl shadow-[0_6px_20px_rgba(22,82,65,0.2)] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--primary-fixed)] to-transparent opacity-50" />
            <span className="text-lg drop-shadow-[0_0_10px_rgba(84,153,181,0.4)] animate-pulse" style={{ animationDuration: "4s" }}>
              👋
            </span>
          </div>
        </div>

        {/* Hero typography */}
        <h1 className="font-zen-heading text-(length:--zen-fs-title) text-transparent bg-clip-text bg-gradient-to-b from-[var(--on-surface)] to-[var(--on-surface-variant)] mb-4 text-center tracking-tight">
          Iniciemos tu biblioteca
        </h1>
        <p className="text-(length:--zen-fs-body) text-[var(--on-surface-variant)]/70 text-center max-w-lg mb-10 leading-relaxed bg-[var(--surface)]/30 backdrop-blur-sm p-3 rounded-lg border border-black/5 font-normal">
          Este es tu lienzo en blanco para comprender, crear o avanzar en algún
          tema nuevo. Cella está activo para ayudarte a comenzar.
        </p>

        {/* Quick action chips */}
        <div className="w-full flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 opacity-80">
            <span className="inline-block w-1.5 h-1.5 bg-[var(--primary-fixed)] rounded-full shadow-[0_0_8px_rgba(84,153,181,0.8)]" />
            <span className="font-label-mono text-(length:--zen-fs-label) uppercase tracking-[0.12em] text-[var(--primary)]">
              Inicializar Secuencia
            </span>
            <span className="inline-block w-1.5 h-1.5 bg-[var(--primary-fixed)] rounded-full shadow-[0_0_8px_rgba(84,153,181,0.8)]" />
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {welcomeChips.map((chip) => (
              <button
                key={chip.title}
                onClick={onUpload}
                className={`px-4 py-2.5 rounded-lg bg-[var(--surface-container)]/40 border border-[var(--outline-variant)]/30 backdrop-blur-xl font-label-mono text-(length:--zen-fs-secondary) hover:bg-[var(--surface-container-high)] transition-all duration-300 shadow-md flex items-center gap-2 ${chip.color} ${chip.hover}`}
              >
                <chip.icon className="w-3 h-3 shrink-0" />
                {chip.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const {
    activeDocumentId,
    documents,
    selectedModel,
    activeConversationId,
    activeProjectId,
    projects,
    conversations,
    addDocument,
    setActiveDocument,
    ensureDefaultProject,
    chatDocumentIds,
    setChatDocumentIds,
  } = useZenStore();

  const [showUpload, setShowUpload] = useState(false);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  const activeProject = activeProjectId ? projects.find((p) => p.id === activeProjectId) : null;
  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const indexedDocs = documents.filter((d) => d.status === "indexed");

  const toggleChatDoc = (id: string) => {
    const next = chatDocumentIds.includes(id)
      ? chatDocumentIds.filter((x) => x !== id)
      : [...chatDocumentIds, id];
    setChatDocumentIds(next);
  };

  const isMultiChat = chatDocumentIds.length > 1;

  const handleUploadComplete = (doc: ZenDocument) => {
    addDocument(doc);
    const state = useZenStore.getState();
    const projectId = state.activeProjectId;

    if (projectId) {
      const updatedProjects = state.projects.map((p) =>
        p.id === projectId ? { ...p, documents: [...p.documents, doc.id] } : p
      );
      state.setProjects(updatedProjects);
    } else {
      const defaultProject = ensureDefaultProject();
      const updatedProjects = state.projects.map((p) =>
        p.id === defaultProject.id ? { ...p, documents: [...p.documents, doc.id] } : p
      );
      state.setProjects(updatedProjects);
      state.setActiveProject(defaultProject.id);
    }
    setActiveDocument(doc.id);
    setShowUpload(false);
  };

  const handleReprocess = async () => {
    if (!activeDoc) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/documents/${activeDoc.id}/reprocess`,
        withCsrfHeaders({ method: "POST", credentials: "include" })
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Error al reprocesar");
      }
      const updated = (await res.json()) as ZenDocument;
      useZenStore.setState((state) => ({
        documents: state.documents.map((d) =>
          d.id === updated.id
            ? { ...d, status: "pending", lastError: undefined }
            : d
        ),
      }));
      toast.success("Documento en cola para reprocesar");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al reprocesar");
    }
  };

  // No active document → welcome state
  if (!activeDoc) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <WelcomeState onUpload={() => setShowUpload(true)} />

        <ChatInput
          onSend={() => {}}
          onUpload={() => setShowUpload(true)}
          isLoading={false}
          placeholder="¿Cómo te puedo ayudar hoy?"
        />

        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onComplete={handleUploadComplete}
          />
        )}
      </div>
    );
  }

  if (activeDoc.status === "pending" || activeDoc.status === "processing") {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-container-high)] mx-auto flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[var(--primary-fixed)] animate-spin" />
            </div>
            <div>
              <h2 className="font-label-mono text-(length:--zen-fs-heading) text-[var(--on-surface)] mb-1.5 uppercase tracking-[0.1em]">
                {activeDoc.status === "pending" ? "En cola de procesamiento" : "Procesando documento"}
              </h2>
              <p className="text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] leading-relaxed">
                Estamos indexando el documento. Esto puede tardar unos segundos...
              </p>
            </div>
            <TimelineRenderer status={activeDoc.status} title={activeDoc.title} />
          </div>
        </div>

        <ChatInput
          onSend={() => {}}
          onUpload={() => setShowUpload(true)}
          isLoading={false}
          placeholder="Sube o selecciona un documento para comenzar..."
        />
      </div>
    );
  }

  if (activeDoc.status === "failed") {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 mx-auto flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <h2 className="font-label-mono text-(length:--zen-fs-heading) text-[var(--on-surface)] mb-1.5 uppercase tracking-[0.1em]">
                No se pudo procesar
              </h2>
              <p className="text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] leading-relaxed">
                El documento <span className="font-medium text-[var(--on-surface)]">{activeDoc.title}</span> no
                pudo ser indexado. Intenta reprocesarlo o usa otro archivo.
              </p>
              {activeDoc.lastError && (
                <p className="mt-2 text-(length:--zen-fs-label) font-mono text-[var(--on-surface-variant)] rounded-md px-2 py-1.5 break-words text-left bg-[var(--surface-container-high)]">
                  {activeDoc.lastError}
                </p>
              )}
            </div>
            <TimelineRenderer status="failed" title={activeDoc.title} />
            <button
              onClick={handleReprocess}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-(length:--zen-fs-label) font-label-mono uppercase tracking-[0.15em] hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="w-3 h-3" />
              Reprocesar documento
            </button>
          </div>
        </div>

        <ChatInput
          onSend={() => {}}
          onUpload={() => setShowUpload(true)}
          isLoading={false}
          placeholder="Selecciona un documento para comenzar..."
        />
      </div>
    );
  }

  // Active document indexed → chat
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 pt-2 pb-0.5 relative shrink-0">
        <button
          onClick={() => setDocPickerOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full [font-size:10px] font-label-mono uppercase tracking-[0.12em] transition-colors",
            isMultiChat
              ? "bg-[var(--primary)]/10 text-[var(--primary-fixed)]"
              : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
          )}
          title="Seleccionar documentos para el chat"
        >
          <Files className="w-3 h-3" />
          {isMultiChat
            ? `${chatDocumentIds.length} documentos`
            : "Chat con 1 documento"}
        </button>
        <span className="font-label-mono text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] truncate">
          {activeProject
            ? `${activeProject.name} / ${activeDoc.title}`
            : activeDoc.title}
        </span>

        {docPickerOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setDocPickerOpen(false)} />
            <div className="absolute left-2 top-9 z-40 w-72 max-h-72 overflow-y-auto bg-[var(--surface-container-lowest)]/95 border border-[var(--outline-variant)]/30 rounded-xl shadow-xl p-2 backdrop-blur-xl">
              <p className="font-label-mono text-(length:--zen-fs-label) uppercase tracking-wider text-[var(--on-surface-variant)] px-2 pb-1.5">
                Selecciona documentos (chat multi-doc)
              </p>
              {indexedDocs.length === 0 ? (
                <p className="text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] px-2 py-3 text-center">
                  No hay documentos indexados
                </p>
              ) : (
                indexedDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => toggleChatDoc(doc.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left font-label-mono text-(length:--zen-fs-secondary) transition-colors",
                      chatDocumentIds.includes(doc.id)
                        ? "text-[var(--primary-fixed)] bg-[var(--primary)]/5"
                        : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)]"
                    )}
                  >
                    <span
                      className={cn(
                        "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                        chatDocumentIds.includes(doc.id)
                          ? "bg-[var(--primary-fixed)] border-[var(--primary-fixed)]"
                          : "border-[var(--outline-variant)]"
                      )}
                    >
                      {chatDocumentIds.includes(doc.id) && <Check className="w-2.5 h-2.5 text-[var(--on-primary-container)]" />}
                    </span>
                    <span className="truncate">{doc.title}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <ChatInterface
        documentId={activeDoc.id}
        documentTitle={activeDoc.title}
        documentIds={isMultiChat ? chatDocumentIds : undefined}
        conversationId={activeConversation?.backendId}
        model={selectedModel}
        onCitationClick={(page) => {
          // Open the right sidebar's document viewer and request a scroll to
          // the cited page. The Viewer tab is responsible for honouring the
          // requested page (via a pendingScrollToPage ref or query param);
          // until that wiring lands, switching tabs is the best we can do.
          useZenStore.getState().setRightTab("document");
          if (typeof page === "number" && page > 0) {
            // Stash the requested page so the Viewer tab can pick it up.
            if (typeof window !== "undefined") {
              (window as unknown as { __pendingCitationPage?: number }).__pendingCitationPage = page;
            }
          }
        }}
        onUploadClick={() => setShowUpload(true)}
        className="flex-1"
      />

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}
