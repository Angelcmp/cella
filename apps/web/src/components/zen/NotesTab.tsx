"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, StickyNote, Trash2, Pencil, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { withCsrfHeaders } from "@/lib/csrf";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Note {
  id: string;
  document_id: string;
  content: string;
  created_at: string | null;
  updated_at: string | null;
}

export default function NotesTab({ documentId }: { documentId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/documents/${documentId}/notes`, { credentials: "include" });
      if (res.ok) {
        setNotes(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    setNotes([]);
    setDraft("");
    setEditingId(null);
    setLoading(true);
    loadNotes();
  }, [documentId, loadNotes]);

  const createNote = async () => {
    const content = draft.trim();
    if (!content) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/documents/${documentId}/notes`, {
        method: "POST",
        credentials: "include",
        headers: withCsrfHeaders({ headers: { "Content-Type": "application/json" } }).headers,
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        toast.error("Error al crear la nota");
        return;
      }
      const created = await res.json();
      setNotes((prev) => [created, ...prev]);
      setDraft("");
      toast.success("Nota creada");
    } catch {
      toast.error("Error de conexión al crear la nota");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditingText(note.content);
  };

  const saveEdit = async (note: Note) => {
    const content = editingText.trim();
    if (!content) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/documents/${documentId}/notes/${note.id}`, {
        method: "PUT",
        credentials: "include",
        headers: withCsrfHeaders({ headers: { "Content-Type": "application/json" } }).headers,
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        toast.error("Error al actualizar la nota");
        return;
      }
      const updated = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setEditingId(null);
      toast.success("Nota actualizada");
    } catch {
      toast.error("Error de conexión al actualizar la nota");
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`${API_URL}/documents/${documentId}/notes/${noteId}`, {
        method: "DELETE",
        credentials: "include",
        headers: withCsrfHeaders({ headers: {} }).headers,
      });
      if (!res.ok) {
        toast.error("Error al eliminar la nota");
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (editingId === noteId) setEditingId(null);
      toast.success("Nota eliminada");
    } catch {
      toast.error("Error de conexión al eliminar la nota");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-5 h-5 text-[var(--accent-primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
        <StickyNote className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
        Notas
      </h3>

      <div className="rounded-xl border border-[var(--border-subtle)] p-2">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) createNote();
          }}
          placeholder="Escribe una nota... (Ctrl+Enter para guardar)"
          className="w-full resize-none bg-transparent text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none leading-relaxed min-h-[52px]"
        />
        <div className="flex items-center justify-end mt-1">
          <button
            onClick={createNote}
            disabled={saving || !draft.trim()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent-primary)] text-white text-[10px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            Añadir nota
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-[10px] text-[var(--text-muted)] text-center py-4">
          Sin notas todavía
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="group rounded-xl border border-[var(--border-subtle)] p-3">
              {editingId === note.id ? (
                <div>
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="w-full resize-none bg-transparent text-[11px] text-[var(--text-primary)] outline-none leading-relaxed min-h-[48px]"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => saveEdit(note)}
                      disabled={saving}
                      className="p-1 text-[var(--accent-primary)] hover:opacity-80"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {note.updated_at ? new Date(note.updated_at).toLocaleString() : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(note)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Editar"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-red-500"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
