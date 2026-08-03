"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useZenStore, type ZenDocument } from "./store";
import ChatInterface from "@/components/ChatInterface";
import ChatInput from "./ChatInput";
import UploadModal from "./UploadModal";
import ZenUploadZone from "./ZenUploadZone";
import TimelineRenderer from "./TimelineRenderer";

export default function ChatPanel() {
  const {
    activeDocumentId,
    documents,
    selectedModel,
    addDocument,
    setActiveDocument,
    ensureDefaultProject,
  } = useZenStore();

  const [showUpload, setShowUpload] = useState(false);
  const activeDoc = documents.find((d) => d.id === activeDocumentId);

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
                pudo ser indexado. Intenta subirlo nuevamente o usa otro archivo.
              </p>
            </div>
            <TimelineRenderer status="failed" title={activeDoc.title} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ChatInterface
        documentId={activeDoc.id}
        documentTitle={activeDoc.title}
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
