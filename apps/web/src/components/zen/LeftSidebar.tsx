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
  SlidersHorizontal,
  MessageSquarePlus,
  Trash2,
  X,
} from "lucide-react";
import { useZenStore, type ZenDocument, type Conversation } from "./store";
import SourceCard from "./SourceCard";
import ConversationItem from "./ConversationItem";
import UploadModal from "./UploadModal";
import HistoryModal from "./HistoryModal";
import SettingsPopover from "./SettingsPopover";
import { withCsrfHeaders } from "@/lib/csrf";
import { cn } from "@/lib/utils";

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
    setConversations,
    removeProject,
    addDocToProject,
    removeDocFromProject,
    setModelsModalOpen,
  } = useZenStore();

  const [showUpload, setShowUpload] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [addDocToProjectId, setAddDocToProjectId] = useState<string | null>(null);

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

  // Seed conversations from backend on mount
  useEffect(() => {
    fetch(`${API_URL}/conversations`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((backendConvs: Array<{ id: string; document_id: string; document_ids?: string[]; document_title?: string; updated_at?: string; message_count?: number }>) => {
        const state = useZenStore.getState();
        const existing = state.conversations;
        const existingBackendIds = new Set(existing.filter((c) => c.backendId).map((c) => c.backendId));
        const merged = existing.filter((c) => !c.backendId || existingBackendIds.has(c.backendId));

        for (const bc of backendConvs) {
          if (!existingBackendIds.has(bc.id)) {
            merged.push({
              id: crypto.randomUUID(),
              title: bc.document_title || "Conversación",
              pinned: false,
              projectId: null,
              documentId: bc.document_id,
              documentIds: bc.document_ids,
              backendId: bc.id,
              createdAt: bc.updated_at || new Date().toISOString(),
              updatedAt: bc.updated_at || new Date().toISOString(),
            });
          }
        }
        // Sort: most recent first
        merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setConversations(merged);
      })
      .catch(() => {});
  }, []);

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

  // Filter by active project
  const activeProject = activeProjectId ? projects.find((p) => p.id === activeProjectId) : null;
  const activeProjectDocIds = activeProject ? new Set(activeProject.documents) : null;

  const filteredDocuments = activeProjectDocIds
    ? documents.filter((d) => activeProjectDocIds.has(d.id))
    : documents;

  const filteredConversations = activeProjectId
    ? conversations.filter((c) => !c.projectId || c.projectId === activeProjectId)
    : conversations;

  const pinnedConversations = filteredConversations
    .filter((c) => c.pinned)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const normalConversations = filteredConversations
    .filter((c) => !c.pinned)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="flex flex-col h-full">
      {/* Notebook header */}
      <div className="p-4 mb-1 flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2 L30 16 L16 30 L2 16 Z" fill="var(--primary-fixed)" />
        </svg>
        <span className="font-label-mono text-[14px] uppercase tracking-[0.15em] text-[var(--primary)]">
          Cella
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {/* Nueva Conversación */}
        <div className="px-2 py-1.5">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary-fixed)] text-white font-label-mono text-(length:--zen-fs-body) hover:opacity-90 transition-opacity"
            title="Nueva conversación"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>Nueva conversación</span>
          </button>
        </div>

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
          {filteredDocuments.length === 0 ? (
            <p className="font-label-mono text-(length:--zen-fs-body) text-[var(--on-surface-variant)]/50 px-3 py-2 leading-relaxed">
              {loadingDocs
                ? "Cargando fuentes..."
                : activeProject
                ? "Sin documentos en este proyecto"
                : "Aún no hay fuentes."}
            </p>
          ) : (
            filteredDocuments.map((doc) => (
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
          {conversations.length === 0 ? (
            <p className="font-label-mono text-(length:--zen-fs-body) text-[var(--on-surface-variant)]/40 px-3 py-2">
              Sin conversaciones
            </p>
          ) : filteredConversations.length === 0 && activeProject ? (
            <p className="font-label-mono text-(length:--zen-fs-body) text-[var(--on-surface-variant)]/40 px-3 py-2">
              Sin conversaciones en este proyecto
            </p>
          ) : filteredConversations.length === 0 ? (
            <p className="font-label-mono text-(length:--zen-fs-body) text-[var(--on-surface-variant)]/40 px-3 py-2">
              Sin conversaciones
            </p>
          ) : null}
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
              <div key={project.id} className="group/proj">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActiveProject(activeProjectId === project.id ? null : project.id);
                    toggleProject(project.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveProject(activeProjectId === project.id ? null : project.id);
                      toggleProject(project.id);
                    }
                  }}
                  className={`w-full flex items-center gap-1.5 px-3 py-1.5 rounded-md font-label-mono text-(length:--zen-fs-body) transition-colors cursor-pointer ${
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (project.isDefault) return;
                      if (confirm(`¿Eliminar proyecto "${project.name}"?`)) {
                        removeProject(project.id);
                      }
                    }}
                    className={cn(
                      "p-0.5 rounded transition-opacity shrink-0",
                      project.isDefault
                        ? "opacity-0 pointer-events-none"
                        : "opacity-0 group-hover/proj:opacity-100 text-[var(--on-surface-variant)]/60 hover:text-red-500"
                    )}
                    title={project.isDefault ? "No se puede eliminar el proyecto por defecto" : "Eliminar proyecto"}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
                {expandedProjects.has(project.id) && (
                  <div className="ml-4 space-y-0.5">
                    {project.documents.map((docId) => {
                      const doc = documents.find((d) => d.id === docId);
                      if (!doc) return null;
                      const isProcessing = doc.status === "pending" || doc.status === "processing";
                      return (
                        <div key={doc.id} className="group/doc flex items-center gap-1">
                          <button
                            onClick={() => handleSelectDocument(doc.id)}
                            className={`flex-1 flex items-center px-2 py-0.5 rounded-md font-label-mono text-[10px] transition-colors truncate ${
                              activeDocumentId === doc.id
                                ? "text-[var(--primary)]"
                                : "text-[var(--on-surface-variant)]/60 hover:text-[var(--on-surface)]"
                            }`}
                          >
                            <span className="truncate text-left flex-1">{doc.title}</span>
                            {isProcessing && (
                              <Loader2 className="w-2.5 h-2.5 text-[var(--primary-fixed)] animate-spin shrink-0 ml-1" />
                            )}
                          </button>
                          {!project.isDefault && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeDocFromProject(project.id, doc.id);
                              }}
                              className="p-0.5 rounded opacity-0 group-hover/doc:opacity-100 transition-opacity text-[var(--on-surface-variant)]/40 hover:text-red-500 shrink-0"
                              title="Quitar del proyecto"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={() => setAddDocToProjectId(addDocToProjectId === project.id ? null : project.id)}
                      className="w-full flex items-center gap-1 px-2 py-0.5 rounded-md font-label-mono text-[10px] text-[var(--on-surface-variant)]/40 hover:text-[var(--on-surface)] transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      Añadir documento
                    </button>
                    {addDocToProjectId === project.id && (
                      <div className="ml-1 space-y-0.5 max-h-32 overflow-y-auto">
                        {documents
                          .filter((d) => !project.documents.includes(d.id) && d.status === "indexed")
                          .map((doc) => (
                            <button
                              key={doc.id}
                              onClick={() => {
                                addDocToProject(project.id, doc.id);
                                setAddDocToProjectId(null);
                              }}
                              className="w-full flex items-center gap-1 px-2 py-0.5 rounded-md font-label-mono text-[10px] text-[var(--on-surface-variant)]/60 hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)] transition-colors truncate"
                            >
                              <Plus className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate text-left">{doc.title}</span>
                            </button>
                          ))
                        }
                        {documents.filter((d) => !project.documents.includes(d.id) && d.status === "indexed").length === 0 && (
                          <p className="text-[10px] text-[var(--on-surface-variant)]/40 px-2 py-1">
                            No hay más documentos disponibles
                          </p>
                        )}
                      </div>
                    )}
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
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-lg text-[var(--on-surface-variant)]/60 hover:text-[var(--primary)] transition-colors"
            title="Ajustes"
          >
            <Settings className="w-3 h-3" />
          </button>
          <button
            onClick={() => setModelsModalOpen(true)}
            className="p-1.5 rounded-lg text-[var(--on-surface-variant)]/60 hover:text-[var(--primary)] transition-colors"
            title="Ajustes de modelos"
          >
            <SlidersHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onComplete={handleUploadComplete} />}
      <HistoryModal open={showHistory} onClose={() => setShowHistory(false)} />
      <SettingsPopover open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
