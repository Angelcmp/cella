"use client";

import { useState, useRef, useEffect } from "react";
import { Pin, PinOff, Pencil, Trash2, Check, X, MoreHorizontal } from "lucide-react";
import { useZenStore } from "./store";
import type { Conversation } from "./store";
import CellaDialog from "./CellaDialog";

interface ConversationItemProps {
  conversation: Conversation;
}

export default function ConversationItem({ conversation }: ConversationItemProps) {
  const {
    activeConversationId,
    selectConversation,
    updateConversation,
    removeConversation,
    togglePinConversation,
  } = useZenStore();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = activeConversationId === conversation.id;

  useEffect(() => {
    if (menuOpen) {
      const handler = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setMenuOpen(false);
          setShowDeleteConfirm(false);
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [menuOpen]);

  const handleSelect = () => {
    selectConversation(conversation.id);
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
    setShowDeleteConfirm(false);
    setMenuOpen(false);
  };

  return (
    <div className="relative">
      <div
        onClick={handleSelect}
        className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors cursor-pointer ${
          isActive
            ? "text-[var(--on-surface)] bg-[var(--zen-hover)]"
            : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--zen-hover)]"
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
              className="flex-1 text-[12px] bg-[var(--zen-panel)] border border-[var(--zen-line)] rounded px-1.5 py-0.5 text-[var(--on-surface)] outline-none focus:border-[var(--primary-fixed)]"
              autoFocus
            />
            <button
              onClick={handleSaveEdit}
              className="p-0.5 text-[var(--primary-fixed)] hover:bg-[var(--zen-hover)] rounded"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-0.5 text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)] rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 truncate">{conversation.title}</span>

            {conversation.pinned && (
              <Pin className="w-2.5 h-2.5 text-[var(--primary-fixed)] shrink-0 opacity-60" />
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--zen-hover)]"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {menuOpen && !editing && (
        <div
          ref={menuRef}
          className="absolute right-0 top-8 z-30 w-48 bg-[var(--zen-panel)] border border-[var(--zen-line)] rounded-lg shadow-[var(--zen-elev-2)] py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setEditing(true); setMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--on-surface)] hover:bg-[var(--zen-hover)] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-[var(--on-surface-variant)]" />
            Renombrar
          </button>
          <button
            onClick={() => { togglePinConversation(conversation.id); setMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--on-surface)] hover:bg-[var(--zen-hover)] transition-colors"
          >
            {conversation.pinned ? (
              <PinOff className="w-3.5 h-3.5 text-[var(--on-surface-variant)]" />
            ) : (
              <Pin className="w-3.5 h-3.5 text-[var(--on-surface-variant)]" />
            )}
            {conversation.pinned ? "Quitar fijado" : "Fijar"}
          </button>
          <div className="border-t border-[var(--zen-line)] my-1" />
          <button
            onClick={() => { setMenuOpen(false); setShowDeleteConfirm(true); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </div>
      )}

      <CellaDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Eliminar conversación"
        maxWidth="420px"
      >
        <div className="space-y-4">
          <p className="text-[13px] leading-relaxed text-[var(--on-surface-variant)]">
            ¿Eliminar{" "}
            <span className="font-medium text-[var(--on-surface)]">
              &quot;{conversation.title}&quot;
            </span>
            ? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3.5 py-2 text-[13px] rounded-lg bg-[var(--zen-hover)] text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="px-3.5 py-2 text-[13px] rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      </CellaDialog>
    </div>
  );
}
