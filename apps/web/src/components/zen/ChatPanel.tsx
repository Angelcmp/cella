"use client";

import { useState } from "react";
import { Loader2, Files, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useZenStore, type ZenDocument } from "./store";
import ChatInterface from "@/components/ChatInterface";
import ChatInput from "./ChatInput";
import UploadModal from "./UploadModal";
import ZenUploadZone from "./ZenUploadZone";
import TimelineRenderer from "./TimelineRenderer";
import { withCsrfHeaders } from "@/lib/csrf";
import { cn } from "@/lib/utils";

export default function ChatPanel() {
  const {
    activeDocumentId,
    documents,
    selectedModel,
    addDocument,
    setActiveDocument,
    ensureDefaultProject,
    chatDocumentIds,
    setChatDocumentIds,
  } = useZenStore();

  const [showUpload, setShowUpload] = useState(false);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const activeDoc = documents.find((d) => d.id === activeDocumentId);

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
    const defaultProject = ensureDefaultProject();
    const state = useZenStore.getState();
    const updatedProjects = state.projects.map((p) =>
      p.id === defaultProject.id ? { ...p, documents: [...p.documents, doc.id] } : p
    );
    state.setProjects(updatedProjects);
    state.setActiveProject(defaultProject.id);
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

  // Empty state: no documents uploaded yet
  if (documents.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-muted)] mx-auto flex items-center justify-center">
              <svg
                className="w-6 h-6 text-[var(--text-muted)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                Bienvenido a Cella
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Sube un documento PDF, DOCX, PPTX o TXT para comenzar a explorar
                su mapa conceptual y chatear con inteligencia artificial.
              </p>
            </div>
            <ZenUploadZone onComplete={handleUploadComplete} />
          </div>
        </div>
      </div>
    );
  }

  if (!activeDoc) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-muted)] mx-auto mb-3 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-[var(--text-muted)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">
              Selecciona un documento
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Elige un documento desde el panel de proyectos para comenzar a
              chatear.
            </p>
          </div>
        </div>

        <ChatInput
          onSend={() => {}}
          onUpload={() => setShowUpload(true)}
          isLoading={false}
          placeholder="Selecciona un documento para comenzar..."
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
          <div className="w-full max-w-md text-center space-y-6">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-muted)] mx-auto flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[var(--accent-primary)] animate-spin" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                {activeDoc.status === "pending" ? "En cola de procesamiento" : "Procesando documento"}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Estamos indexando el documento. Esto puede tardar unos segundos...
              </p>
            </div>
            <TimelineRenderer status={activeDoc.status} title={activeDoc.title} />
          </div>
        </div>
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
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                No se pudo procesar
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                El documento <span className="font-medium text-[var(--text-primary)]">{activeDoc.title}</span> no
                pudo ser indexado. Intenta reprocesarlo o usa otro archivo.
              </p>
              {activeDoc.lastError && (
                <p className="mt-2 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-muted)] rounded-md px-2 py-1.5 break-words text-left">
                  {activeDoc.lastError}
                </p>
              )}
            </div>
            <TimelineRenderer status="failed" title={activeDoc.title} />
            <button
              onClick={handleReprocess}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-[11px] font-medium hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="w-3 h-3" />
              Reprocesar documento
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 pt-2 pb-0.5 relative">
        <button
          onClick={() => setDocPickerOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-medium transition-colors",
            isMultiChat
              ? "border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
              : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
          )}
          title="Seleccionar documentos para el chat"
        >
          <Files className="w-3 h-3" />
          {isMultiChat
            ? `${chatDocumentIds.length} documentos`
            : "Chat con 1 documento"}
        </button>
        <span className="text-[10px] text-[var(--text-muted)] truncate">{activeDoc.title}</span>

        {docPickerOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setDocPickerOpen(false)} />
            <div className="absolute left-2 top-9 z-40 w-72 max-h-72 overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-xl p-2">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] px-2 pb-1.5">
                Selecciona documentos (chat multi-doc)
              </p>
              {indexedDocs.length === 0 ? (
                <p className="text-[10px] text-[var(--text-muted)] px-2 py-3 text-center">
                  No hay documentos indexados
                </p>
              ) : (
                indexedDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => toggleChatDoc(doc.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] transition-colors",
                      chatDocumentIds.includes(doc.id)
                        ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                    )}
                  >
                    <span
                      className={cn(
                        "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                        chatDocumentIds.includes(doc.id)
                          ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
                          : "border-[var(--border-subtle)]"
                      )}
                    >
                      {chatDocumentIds.includes(doc.id) && <Check className="w-2.5 h-2.5 text-white" />}
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
        model={selectedModel}
        onCitationClick={() => {}}
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
