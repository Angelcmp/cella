"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { withCsrfHeaders } from "@/lib/csrf";

const MindmapRenderer = dynamic(() => import("@/components/MermaidRenderer"), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DiagramTab({ documentId }: { documentId: string }) {
  const [editable, setEditable] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/documents/${documentId}/mindmap`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const raw = d?.markdown || "";
        setEditable(raw);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId]);

  const save = async () => {
    if (!documentId || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/documents/${documentId}/mindmap`, {
        method: "POST",
        credentials: "include",
        headers: withCsrfHeaders({ headers: { "Content-Type": "application/json" } }).headers,
        body: JSON.stringify({ markdown: editable }),
      });
      if (res.ok) {
        setEditable(editable);
        toast.success("Diagrama guardado");
      } else {
        toast.error("Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    if (!documentId || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/documents/${documentId}/mindmap`, {
        method: "POST",
        credentials: "include",
        headers: withCsrfHeaders({ headers: { "Content-Type": "application/json" } }).headers,
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const d = await res.json();
        const raw = d?.markdown || "";
        setEditable(raw);
        toast.success("Diagrama regenerado");
      } else {
        toast.error("Error al regenerar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-5 h-5 text-[var(--primary-fixed)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] shrink-0">
        <button
          onClick={save}
          disabled={saving}
          className="p-1 rounded text-[var(--on-surface-variant)] hover:text-[var(--primary-fixed)] hover:bg-[var(--surface-container-high)] transition-colors disabled:opacity-40"
          title="Guardar cambios"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        </button>
        <button
          onClick={regenerate}
          disabled={saving}
          className="p-1 rounded text-[var(--on-surface-variant)] hover:text-[var(--primary-fixed)] hover:bg-[var(--surface-container-high)] transition-colors disabled:opacity-40"
          title="Regenerar"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
      <textarea
        value={editable}
        onChange={(e) => setEditable(e.target.value)}
        className="w-full h-[40%] min-h-[140px] bg-[var(--surface-container-lowest)] border-0 resize-none p-3 zen-text-body zen-read-text font-mono leading-relaxed outline-none focus:ring-1 focus:ring-[var(--primary-fixed)]/30 shrink-0"
        placeholder="Edita el código Mermaid..."
        spellCheck={false}
      />
      <div className="flex-1 min-h-0 border-t border-[var(--outline-variant)]/20 p-2">
        <MindmapRenderer code={editable} />
      </div>
    </div>
  );
}
