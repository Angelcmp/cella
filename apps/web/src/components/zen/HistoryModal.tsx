"use client";

import { useState } from "react";
import { Search, MessageSquare, Pin, Trash2, FolderOpen } from "lucide-react";
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
      maxWidth="760px"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversaciones..."
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-[var(--zen-panel-alt)] border border-transparent rounded-lg text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/50 outline-none focus:border-[var(--primary-fixed)]/40 transition-colors"
            />
          </div>
          <div className="flex rounded-lg border border-[var(--zen-line)] p-0.5">
            {(["all", "pinned"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-[12px] rounded-md transition-colors ${
                  filter === f
                    ? "bg-[var(--zen-hover)] text-[var(--on-surface)]"
                    : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
                }`}
              >
                {f === "all" ? "Todas" : "Ancladas"}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare className="w-8 h-8 text-[var(--on-surface-variant)]/30 mb-3" />
            <p className="text-[13px] text-[var(--on-surface-variant)]">
              {search ? "Sin resultados" : "No hay conversaciones aún"}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 max-h-[60vh] overflow-y-auto -mx-1 px-1">
            {filtered.map((conv) => {
              const project = conv.projectId
                ? projects.find((p) => p.id === conv.projectId)
                : null;
              const isActive = activeConversationId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelect(conv)}
                  className={`group w-full flex items-center gap-3 px-3 py-3 text-left transition-colors cursor-pointer rounded-lg ${
                    isActive
                      ? "bg-[var(--zen-hover)]"
                      : "hover:bg-[var(--zen-hover)]"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {conv.pinned && (
                        <Pin className="w-3.5 h-3.5 text-[var(--primary-fixed)] shrink-0" />
                      )}
                      <p className="text-[14px] text-[var(--on-surface)] truncate">
                        {conv.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-[var(--on-surface-variant)]">
                        {new Date(conv.updatedAt).toLocaleDateString("es-ES")}
                      </span>
                      {project && (
                        <span className="flex items-center gap-1 text-[11px] text-[var(--on-surface-variant)]">
                          <FolderOpen className="w-3 h-3" />
                          {project.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinConversation(conv.id);
                      }}
                      className="p-1.5 rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--zen-panel-alt)] hover:text-[var(--on-surface)] transition-colors"
                      title={conv.pinned ? "Desanclar" : "Anclar"}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeConversation(conv.id);
                      }}
                      className="p-1.5 rounded-md text-[var(--on-surface-variant)] hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
