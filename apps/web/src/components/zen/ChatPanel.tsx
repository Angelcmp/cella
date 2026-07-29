"use client";

import { useState } from "react";
import { useZenStore, type ZenDocument, AVAILABLE_MODELS } from "./store";
import ChatInterface from "@/components/ChatInterface";
import ChatInput from "./ChatInput";
import UploadModal from "./UploadModal";

export default function ChatPanel() {
  const {
    activeDocumentId,
    documents,
    selectedModel,
    setSelectedModel,
    addDocument,
    setActiveDocument,
  } = useZenStore();

  const [showUpload, setShowUpload] = useState(false);
  const activeDoc = documents.find((d) => d.id === activeDocumentId);

  const handleUploadComplete = (doc: ZenDocument) => {
    addDocument(doc);
    setActiveDocument(doc.id);
    setShowUpload(false);
  };

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
              Bienvenido a Cella
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Sube un documento PDF, DOCX, PPTX o TXT desde el panel de{" "}
              <strong>Proyectos</strong> para comenzar a chatear con inteligencia
              artificial.
            </p>
          </div>
        </div>

        <ChatInput
          onSend={() => {}}
          onUpload={() => setShowUpload(true)}
          isLoading={false}
          placeholder="Sube un documento para comenzar..."
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
