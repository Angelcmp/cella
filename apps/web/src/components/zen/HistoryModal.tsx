"use client";

import { useState } from "react";
import {
  Search,
  MessageSquare,
  Pin,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { useZenStore, type Conversation } from "./store";
import CellaDialog from "./CellaDialog";

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
}

export default function HistoryModal({ open, onClose }: HistoryModalProps) {
  const {
    conversations,
    projects,
    activeConversationId,
    setActiveConversation,
    removeConversation,
    togglePinConversation,
    setActiveProject,
    setActiveDocument,
  } = useZenStore();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned">("all");

  const filtered = conversations
    .filter((c) => {
      if (filter === "pinned" && !c.pinned) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.title.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleSelect = (conv: Conversation) => {
    if (conv.projectId) {
      setActiveProject(conv.projectId);
      if (conv.documentId) setActiveDocument(conv.documentId);
    }
    setActiveConversation(conv.id);
    onClose();
  };

  return (
    <CellaDialog
      open={open}
      onClose={onClose}
      title="Historial de conversaciones"
      maxWidth="520px"
    >
      <div className="space-y-3 p-1">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversaciones..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-muted)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)]"
            />
          </div>
          <div className="flex rounded-lg border border-[var(--border-subtle)] overflow-hidden">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-xs transition-colors ${
                filter === "all"
                  ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter("pinned")}
              className={`px-3 py-1.5 text-xs transition-colors ${
                filter === "pinned"
                  ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Ancladas
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="w-8 h-8 text-[var(--text-muted)]/40 mb-3" />
            <p className="text-sm text-[var(--text-muted)]">
              {search ? "Sin resultados" : "No hay conversaciones aún"}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((conv) => {
              const project = conv.projectId
                ? projects.find((p) => p.id === conv.projectId)
                : null;
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelect(conv)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-muted)] cursor-pointer rounded-lg ${
                    activeConversationId === conv.id
                      ? "bg-[var(--accent-primary)]/5 border-l-2 border-[var(--accent-primary)]"
                      : "border-l-2 border-transparent"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {conv.pinned && (
                        <Pin className="w-3 h-3 text-[var(--accent-primary)] shrink-0" />
                      )}
                      <p className="text-sm text-[var(--text-primary)] truncate">
                        {conv.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {new Date(conv.updatedAt).toLocaleDateString("es-ES")}
                      </span>
                      {project && (
                        <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                          <FolderOpen className="w-2.5 h-2.5" />
                          {project.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinConversation(conv.id);
                      }}
                      className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeConversation(conv.id);
                      }}
                      className="p-1 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CellaDialog>
  );
}
