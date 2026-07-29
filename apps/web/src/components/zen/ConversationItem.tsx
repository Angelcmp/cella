"use client";

import { useState } from "react";
import { Pin, PinOff, Pencil, Trash2, Check, X } from "lucide-react";
import { useZenStore } from "./store";
import type { Conversation } from "./store";

interface ConversationItemProps {
  conversation: Conversation;
}

export default function ConversationItem({ conversation }: ConversationItemProps) {
  const {
    activeConversationId,
    setActiveConversation,
    updateConversation,
    removeConversation,
    togglePinConversation,
  } = useZenStore();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [showConfirm, setShowConfirm] = useState(false);

  const isActive = activeConversationId === conversation.id;

  const handleSelect = () => {
    setActiveConversation(conversation.id);
  };

  const handleSaveEdit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== conversation.title) {
      updateConversation(conversation.id, { title: trimmed });
    }
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(conversation.title);
    setEditing(false);
  };

  const handleDelete = () => {
    removeConversation(conversation.id);
    setShowConfirm(false);
  };

  return (
    <div className="relative">
      <div
        onClick={handleSelect}
        className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
          isActive
            ? "text-[var(--text-primary)] bg-[var(--bg-muted)]"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
        }`}
      >
        {editing ? (
          <div
            className="flex-1 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") handleCancelEdit();
              }}
              className="flex-1 text-[11px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              autoFocus
            />
            <button
              onClick={handleSaveEdit}
              className="p-0.5 text-[var(--accent-primary)] hover:bg-[var(--bg-muted)] rounded"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <span className="flex-1 truncate">{conversation.title}</span>
        )}

        {conversation.pinned && !editing && (
          <Pin className="w-2.5 h-2.5 text-[var(--accent-primary)] shrink-0 opacity-60" />
        )}

        {!editing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="p-0.5 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); togglePinConversation(conversation.id); }}
              className="p-0.5 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
            >
              {conversation.pinned ? <PinOff className="w-2.5 h-2.5" /> : <Pin className="w-2.5 h-2.5" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
              className="p-0.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>

      {showConfirm && (
        <div
          className="absolute right-0 top-1 z-10 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-card p-1.5 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] text-[var(--text-secondary)]">Eliminar?</span>
          <button onClick={handleDelete} className="px-1.5 py-0.5 text-[10px] rounded bg-red-500/10 text-red-500 hover:bg-red-500/20">Sí</button>
          <button onClick={() => setShowConfirm(false)} className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">No</button>
        </div>
      )}
    </div>
  );
}
