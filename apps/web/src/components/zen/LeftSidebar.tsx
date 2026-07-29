"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Upload,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  Bot,
  Clock,
  Settings,
} from "lucide-react";
import { useZenStore, type ZenDocument, type Project, type Conversation } from "./store";
import ConversationItem from "./ConversationItem";
import UploadModal from "./UploadModal";
import HistoryModal from "./HistoryModal";
import SettingsPopover from "./SettingsPopover";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LeftSidebar({ onClose }: { onClose: () => void }) {
  const {
    projects,
    documents,
    activeDocumentId,
    activeProjectId,
    conversations,
    setActiveDocument,
    setActiveProject,
    setActiveConversation,
    setRightTab,
    addDocument,
    setDocuments,
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
        }));
        setDocuments(docs);
      }
    } catch {} finally {
      setLoadingDocs(false);
    }
  }, [setDocuments]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

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
  };

  const handleSelectDocument = (docId: string) => {
    setActiveDocument(docId);
    setRightTab("document");
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
      <div className="px-2 pt-2 pb-1.5 space-y-1">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo chat
        </button>
        <button
          onClick={() => setShowUpload(true)}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Subir archivo
        </button>
        <div className="pt-1.5 mt-0.5 border-t border-[var(--border-subtle)]">
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            Agent
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Historial
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pt-0.5">
        {pinnedConversations.length > 0 && (
          <div className="mb-1">
            {pinnedConversations.map((conv) => (
              <ConversationItem key={conv.id} conversation={conv} />
            ))}
          </div>
        )}

        {normalConversations.map((conv) => (
          <ConversationItem key={conv.id} conversation={conv} />
        ))}

        {conversations.length === 0 && (
          <p className="text-[10px] text-[var(--text-muted)] px-2 py-4 text-center">
            Sin conversaciones aún
          </p>
        )}

        <div className="mt-2 pt-1.5 border-t border-[var(--border-subtle)]">
          <button
            onClick={() => setProjectsOpen(!projectsOpen)}
            className="w-full flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {projectsOpen ? (
              <ChevronDown className="w-2 h-2" />
            ) : (
              <ChevronRight className="w-2 h-2" />
            )}
            Proyectos
          </button>

          {projectsOpen && (
            <div className="ml-1 space-y-0.5 mt-0.5">
              {projects.map((project) => (
                <div key={project.id}>
                  <button
                    onClick={() => {
                      setActiveProject(activeProjectId === project.id ? null : project.id);
                      toggleProject(project.id);
                    }}
                    className={`w-full flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
                      activeProjectId === project.id
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {expandedProjects.has(project.id) ? (
                      <ChevronDown className="w-2.5 h-2.5 shrink-0" />
                    ) : (
                      <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                    )}
                    <FolderOpen className="w-3 h-3 shrink-0" />
                    <span className="truncate">{project.name}</span>
                  </button>
                  {expandedProjects.has(project.id) && (
                    <div className="ml-3.5 space-y-0.5">
                      {project.documents.map((docId) => {
                        const doc = documents.find((d) => d.id === docId);
                        if (!doc) return null;
                        return (
                          <button
                            key={doc.id}
                            onClick={() => handleSelectDocument(doc.id)}
                            className={`w-full flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
                              activeDocumentId === doc.id
                                ? "text-[var(--text-primary)]"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate">{doc.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {isCreating ? (
                <div className="flex items-center gap-1 px-2 py-0.5">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateProject();
                      if (e.key === "Escape") setIsCreating(false);
                    }}
                    placeholder="Nombre del proyecto"
                    className="flex-1 text-[11px] bg-transparent border-b border-[var(--border-subtle)] px-0.5 py-0.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)]"
                    autoFocus
                  />
                  <button onClick={handleCreateProject} className="p-0.5 text-[var(--accent-primary)] rounded">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Plus className="w-2.5 h-2.5" />
                  Nuevo proyecto
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-2 py-1.5 border-t border-[var(--border-subtle)]">
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-[9px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
        >
          <Settings className="w-3 h-3" />
          Ajustes
        </button>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onComplete={handleUploadComplete} />}
      <HistoryModal open={showHistory} onClose={() => setShowHistory(false)} />
      <SettingsPopover open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
