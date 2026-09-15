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
  { icon: GraduationCap, title: "Aprender un tema nuevo" },
  { icon: SquarePen, title: "Crear contenido nuevo" },
  { icon: Rocket, title: "Avanzar en proyecto" },
];

function WelcomeState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col items-center justify-center p-8 w-full max-w-2xl mx-auto mt-8 mb-24">
        <div className="mb-5 w-12 h-12 flex items-center justify-center rounded-xl border border-[var(--zen-line)] bg-[var(--zen-panel)]">
          <span className="text-xl">👋</span>
        </div>

        <h1 className="text-(length:--zen-fs-title) text-[var(--on-surface)] mb-3 text-center tracking-tight">
          Iniciemos tu biblioteca
        </h1>
        <p className="text-(length:--zen-fs-body) text-[var(--on-surface-variant)] text-center max-w-lg mb-8 leading-relaxed">
          Este es tu lienzo en blanco para comprender, crear o avanzar en algún
          tema nuevo. Cella está activo para ayudarte a comenzar.
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {welcomeChips.map((chip) => (
            <button
              key={chip.title}
              onClick={onUpload}
              className="px-3.5 py-2 rounded-lg border border-[var(--zen-line)] bg-[var(--zen-panel)] text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)] hover:text-[var(--on-surface)] transition-colors flex items-center gap-2"
            >
              <chip.icon className="w-3.5 h-3.5 shrink-0" />
              {chip.title}
            </button>
          ))}
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
            <div className="w-12 h-12 rounded-xl bg-[var(--zen-panel)] border border-[var(--zen-line)] mx-auto flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[var(--primary-fixed)] animate-spin" />
            </div>
            <div>
              <h2 className="text-(length:--zen-fs-heading) font-semibold text-[var(--on-surface)] mb-1.5">
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
              <h2 className="text-(length:--zen-fs-heading) font-semibold text-[var(--on-surface)] mb-1.5">
                No se pudo procesar
              </h2>
              <p className="text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] leading-relaxed">
                El documento <span className="font-medium text-[var(--on-surface)]">{activeDoc.title}</span> no
                pudo ser indexado. Intenta reprocesarlo o usa otro archivo.
              </p>
              {activeDoc.lastError && (
                <p className="mt-2 text-(length:--zen-fs-label) font-mono text-[var(--on-surface-variant)] rounded-md px-2 py-1.5 break-words text-left bg-[var(--zen-panel)] border border-[var(--zen-line)]">
                  {activeDoc.lastError}
                </p>
              )}
            </div>
            <TimelineRenderer status="failed" title={activeDoc.title} />
            <button
              onClick={handleReprocess}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary-fixed)] text-white text-(length:--zen-fs-label) font-medium hover:opacity-90 transition-opacity"
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
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-colors border border-transparent",
            isMultiChat
              ? "bg-[var(--primary-container)]/40 text-[var(--primary-fixed)]"
              : "text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)]"
          )}
          title="Seleccionar documentos para el chat"
        >
          <Files className="w-3 h-3" />
          {isMultiChat
            ? `${chatDocumentIds.length} documentos`
            : "Chat con 1 documento"}
        </button>
        <span className="text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] truncate">
          {activeProject
            ? `${activeProject.name} / ${activeDoc.title}`
            : activeDoc.title}
        </span>

        {docPickerOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setDocPickerOpen(false)} />
            <div className="absolute left-2 top-9 z-40 w-72 max-h-72 overflow-y-auto bg-[var(--zen-panel)] border border-[var(--zen-line)] rounded-lg shadow-[var(--zen-elev-2)] p-2">
              <p className="text-(length:--zen-fs-label) text-[var(--on-surface-variant)] px-2 pb-1.5">
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
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-(length:--zen-fs-secondary) transition-colors",
                      chatDocumentIds.includes(doc.id)
                        ? "text-[var(--primary-fixed)] bg-[var(--zen-hover)]"
                        : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--zen-hover)]"
                    )}
                  >
                    <span
                      className={cn(
                        "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                        chatDocumentIds.includes(doc.id)
                          ? "bg-[var(--primary-fixed)] border-[var(--primary-fixed)]"
                          : "border-[var(--zen-line)]"
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
          // Open the right sidebar's document viewer and jump to the cited page.
          if (typeof page === "number" && page > 0) {
            useZenStore.getState().setHighlightPage(page);
          }
          useZenStore.getState().setRightTab("document");
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
