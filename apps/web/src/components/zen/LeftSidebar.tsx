"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  PlusCircle,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Loader2,
  Settings,
} from "lucide-react";
import { useZenStore, type ZenDocument, type Conversation } from "./store";
import SourceCard from "./SourceCard";
import ConversationItem from "./ConversationItem";
import UploadModal from "./UploadModal";
import HistoryModal from "./HistoryModal";
import SettingsPopover from "./SettingsPopover";
import { withCsrfHeaders } from "@/lib/csrf";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LeftSidebar() {
  const {
    projects,
    documents,
    activeDocumentId,
    activeProjectId,
    conversations,
    chatDocumentIds,
    setActiveDocument,
    setActiveProject,
    setActiveConversation,
    setRightTab,
    addDocument,
    setDocuments,
    setChatDocumentIds,
    addConversation,
  } = useZenStore();

  const [showUpload, setShowUpload] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/documents/?limit=50`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const docs: ZenDocument[] = (data.documents || data || []).map((d: any) => ({
          id: d.id,
          title: d.title || d.filename || "Sin título",
          filename: d.filename || "",
          status: d.status || "pending",
          pages: d.pages || 0,
          size: d.file_size || d.size || 0,
          createdAt: d.created_at || d.createdAt || new Date().toISOString(),
          lastError: d.last_error || undefined,
          attempts: d.attempts || 0,
        }));
        setDocuments(docs);
        return docs;
      }
    } catch {} finally {
      setLoadingDocs(false);
    }
    return [];
  }, [setDocuments]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      const docs = await fetchDocuments();
      const hasPending = docs.some((d) => d.status === "pending" || d.status === "processing");
      if (hasPending && !cancelled) {
        timer = setTimeout(poll, 4000);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [fetchDocuments]);

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    useZenStore.getState().addProject({
      id: crypto.randomUUID(),
      name: newProjectName.trim(),
      documents: [],
      createdAt: new Date().toISOString(),
    });
    setNewProjectName("");
    setIsCreating(false);
  };

  const handleUploadComplete = (doc: ZenDocument) => {
    addDocument(doc);
    if (activeProjectId) {
      const state = useZenStore.getState();
      const updated = state.projects.map((p) =>
        p.id === activeProjectId ? { ...p, documents: [...p.documents, doc.id] } : p
      );
      state.setProjects(updated);
    }
    setShowUpload(false);
    setActiveDocument(doc.id);
    setRightTab("document");
  };

  const handleSelectDocument = (docId: string) => {
    setActiveDocument(docId);
    setRightTab("document");
  };

  const handleReprocess = async (docId: string) => {
    try {
      const res = await fetch(
        `${API_URL}/documents/${docId}/reprocess`,
        withCsrfHeaders({ method: "POST", credentials: "include" })
      );
      if (!res.ok) return;
      setDocuments(
        documents.map((d) => (d.id === docId ? { ...d, status: "pending" } : d))
      );
    } catch {}
  };

  const toggleChatDoc = (docId: string) => {
    setChatDocumentIds(
      chatDocumentIds.includes(docId)
        ? chatDocumentIds.filter((id) => id !== docId)
        : [...chatDocumentIds, docId]
    );
  };

  const handleNewChat = () => {
    const conv: Conversation = {
      id: crypto.randomUUID(),
      title: "Nueva conversación",
      pinned: false,
      projectId: activeProjectId,
      documentId: activeDocumentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addConversation(conv);
    setActiveConversation(conv.id);
  };

  const pinnedConversations = conversations
    .filter((c) => c.pinned)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const normalConversations = conversations
    .filter((c) => !c.pinned)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="flex flex-col h-full">
      {/* Notebook header */}
      <div className="p-4 mb-1 flex items-center gap-2">
        <div className="w-7 h-7 bg-[var(--primary-container)] flex items-center justify-center rounded-lg shadow-[0_0_10px_rgba(84,153,181,0.2)]">
          <svg className="w-3.5 h-3.5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2 L30 16 L16 30 L2 16 Z" fill="var(--on-primary-container)" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="font-label-mono text-(length:--zen-fs-heading) uppercase tracking-[0.15em] text-[var(--primary)]">
          Cella
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {/* Fuentes */}
        <div className="px-2 py-1 flex items-center justify-between">
          <span className="font-label-mono text-(length:--zen-fs-heading) uppercase tracking-[0.12em] text-[var(--on-surface-variant)]/80">
            Fuentes
          </span>
          <button
            onClick={() => setShowUpload(true)}
            className="text-[var(--on-surface-variant)]/60 hover:text-[var(--primary)] transition-colors"
            title="Añadir fuente"
          >
            <PlusCircle className="w-3 h-3" />
          </button>
        </div>
        <nav className="space-y-0.5">
          {documents.length === 0 ? (
            <p className="font-label-mono text-(length:--zen-fs-body) text-[var(--on-surface-variant)]/50 px-3 py-2 leading-relaxed">
              {loadingDocs
                ? "Cargando fuentes..."
                : "Aún no hay fuentes."}
            </p>
          ) : (
            documents.map((doc) => (
              <SourceCard
                key={doc.id}
                doc={doc}
                active={activeDocumentId === doc.id}
                chatChecked={chatDocumentIds.includes(doc.id)}
                onSelect={() => handleSelectDocument(doc.id)}
                onToggleChat={() => toggleChatDoc(doc.id)}
                onReprocess={() => handleReprocess(doc.id)}
              />
            ))
          )}
        </nav>

        {/* Conversaciones */}
        <div className="px-2 pt-3 pb-1 flex items-center justify-between">
          <span className="font-label-mono text-(length:--zen-fs-heading) uppercase tracking-[0.12em] text-[var(--on-surface-variant)]/80">
            Conversaciones
          </span>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-0.5 font-label-mono text-(length:--zen-fs-body) uppercase text-[var(--on-surface-variant)]/60 hover:text-[var(--primary)] transition-colors"
            title="Nuevo chat"
          >
            <Plus className="w-2.5 h-2.5" />
            Nuevo
          </button>
        </div>
        <div className="space-y-0.5">
          {pinnedConversations.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))}
          {normalConversations.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))}
          {conversations.length === 0 && (
            <p className="font-label-mono text-(length:--zen-fs-body) text-[var(--on-surface-variant)]/40 px-3 py-2">
              Sin conversaciones
            </p>
          )}
        </div>

        {/* Proyectos */}
        <div className="px-2 pt-3 pb-1 flex items-center justify-between">
          <span className="font-label-mono text-(length:--zen-fs-heading) uppercase tracking-[0.12em] text-[var(--on-surface-variant)]/80">
            Proyectos
          </span>
          <button
            onClick={() => setProjectsOpen(!projectsOpen)}
            className="text-[var(--on-surface-variant)]/60 hover:text-[var(--primary)] transition-colors"
            title={projectsOpen ? "Ocultar proyectos" : "Mostrar proyectos"}
          >
            {projectsOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        </div>

        {projectsOpen && (
          <div className="space-y-0.5">
            {projects.map((project) => (
              <div key={project.id}>
                <button
                  onClick={() => {
                    setActiveProject(activeProjectId === project.id ? null : project.id);
                    toggleProject(project.id);
                  }}
                  className={`w-full flex items-center gap-1.5 px-3 py-1.5 rounded-md font-label-mono text-(length:--zen-fs-body) transition-colors ${
                    activeProjectId === project.id
                      ? "text-[var(--primary)] bg-[var(--surface-container-high)]"
                      : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
                  }`}
                >
                  {expandedProjects.has(project.id) ? (
                    <ChevronDown className="w-2.5 h-2.5 shrink-0" />
                  ) : (
                    <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                  )}
                  <FolderOpen className="w-3 h-3 shrink-0" />
                  <span className="truncate flex-1 text-left">{project.name}</span>
                  <span className="text-(length:--zen-fs-body) opacity-50 shrink-0">
                    {project.documents.length}
                  </span>
                </button>
                {expandedProjects.has(project.id) && (
                  <div className="ml-4 space-y-0.5">
                    {project.documents.map((docId) => {
                      const doc = documents.find((d) => d.id === docId);
                      if (!doc) return null;
                      const isProcessing = doc.status === "pending" || doc.status === "processing";
                      return (
                        <button
                          key={doc.id}
                          onClick={() => handleSelectDocument(doc.id)}
                          className={`w-full flex items-center gap-1.5 px-3 py-1 rounded-md font-label-mono text-(length:--zen-fs-body) transition-colors ${
                            activeDocumentId === doc.id
                              ? "text-[var(--primary)]"
                              : "text-[var(--on-surface-variant)]/60 hover:text-[var(--on-surface)]"
                          }`}
                        >
                          <span className="truncate text-left flex-1">{doc.title}</span>
                          {isProcessing && (
                            <Loader2 className="w-2.5 h-2.5 text-[var(--primary-fixed)] animate-spin shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {isCreating ? (
              <div className="flex items-center gap-2 px-3 py-1.5">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateProject();
                    if (e.key === "Escape") setIsCreating(false);
                  }}
                  placeholder="Nombre del proyecto"
                  className="flex-1 font-label-mono text-(length:--zen-fs-body) bg-transparent border-b border-[var(--outline-variant)] px-1 py-0 text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 outline-none focus:border-[var(--primary)]"
                  autoFocus
                />
                <button onClick={handleCreateProject} className="text-[var(--primary)]">
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-md font-label-mono text-(length:--zen-fs-body) text-[var(--on-surface-variant)]/50 hover:text-[var(--on-surface)] transition-colors"
              >
                <Plus className="w-2.5 h-2.5" />
                Nuevo proyecto
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="p-3 border-t border-[var(--outline-variant)]/10 flex items-center justify-between">
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded-lg text-[var(--on-surface-variant)]/60 hover:text-[var(--primary)] transition-colors"
          title="Ajustes"
        >
          <Settings className="w-3 h-3" />
        </button>
        <button
          onClick={() => setShowUpload(true)}
          className="font-label-mono text-(length:--zen-fs-body) uppercase tracking-[0.12em] text-[var(--primary-fixed)] hover:text-[var(--primary)] transition-colors"
        >
          + Añadir fuente
        </button>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onComplete={handleUploadComplete} />}
      <HistoryModal open={showHistory} onClose={() => setShowHistory(false)} />
      <SettingsPopover open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
