"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Zap,
  RefreshCw,
  Loader2,
  Check,
  Star,
  KeyRound,
} from "lucide-react";
import CellaDialog from "./CellaDialog";
import { useZenStore } from "./store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Provider {
  id: string;
  name: string;
  provider_type: string;
  label: string;
  base_url?: string | null;
  models: string[];
  default_model?: string | null;
  is_default: boolean;
  use_for_embeddings: boolean;
  has_api_key: boolean;
}

interface CatalogEntry {
  label: string;
  base_url: string;
  models: string[];
  needs_key: boolean;
}

type Catalog = Record<string, CatalogEntry>;

export default function ProviderSettingsModal() {
  const open = useZenStore((s) => s.modelsModalOpen);
  const setOpen = useZenStore((s) => s.setModelsModalOpen);
  const refreshModels = useZenStore((s) => s.refreshModels);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [catalog, setCatalog] = useState<Catalog>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Add form state
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("openai");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [newKey, setNewKey] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`${API_URL}/providers`),
        fetch(`${API_URL}/providers/catalog`),
      ]);
      if (pRes.ok) setProviders((await pRes.json()) as Provider[]);
      if (cRes.ok) setCatalog((await cRes.json()) as Catalog);
    } catch {}
  }, []);

  useEffect(() => {
    if (open) {
      setMessage(null);
      setAdding(false);
      load();
    }
  }, [open, load]);

  const run = async (url: string, opts?: RequestInit) => {
    const res = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    });
    return res;
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setMessage(null);
    const entry = catalog[newType] || { label: newType, base_url: "", models: [], needs_key: true };
    try {
      const res = await run(`${API_URL}/providers`, {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          provider_type: newType,
          base_url: newType === "openai_compat" ? newBaseUrl.trim() : entry.base_url || undefined,
          api_key: newKey.trim() || undefined,
          models: entry.models,
          is_default: providers.length === 0,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage({ kind: "err", text: body?.detail || "No se pudo guardar" });
        return;
      }
      setNewName("");
      setNewKey("");
      setNewBaseUrl("");
      setAdding(false);
      await load();
      await refreshModels();
      setMessage({ kind: "ok", text: "Proveedor añadido. Haz clic en 'Probar' para verificar la conexión." });
    } catch {
      setMessage({ kind: "err", text: "Error de conexión" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (p: Provider) => {
    setMessage(null);
    try {
      const res = await run(`${API_URL}/providers/${p.id}/test`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) setMessage({ kind: "ok", text: `✓ ${p.name}: ${body?.response || "OK"}` });
      else setMessage({ kind: "err", text: body?.detail || `Fallo en ${p.name}` });
    } catch {
      setMessage({ kind: "err", text: `No se pudo probar ${p.name}` });
    }
  };

  const handleSync = async (p: Provider) => {
    setMessage(null);
    try {
      const res = await run(`${API_URL}/providers/${p.id}/sync-models`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ kind: "ok", text: `Modelos sincronizados: ${(body?.models || []).join(", ")}` });
        await load();
        await refreshModels();
      } else setMessage({ kind: "err", text: body?.detail || "Error al sincronizar" });
    } catch {
      setMessage({ kind: "err", text: "Error al sincronizar modelos" });
    }
  };

  const handleDefault = async (p: Provider) => {
    setMessage(null);
    try {
      const res = await run(`${API_URL}/providers/${p.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_default: true }),
      });
      if (res.ok) {
        await load();
        await refreshModels();
        setMessage({ kind: "ok", text: `${p.name} es ahora el proveedor por defecto` });
      } else setMessage({ kind: "err", text: "No se pudo cambiar el default" });
    } catch {
      setMessage({ kind: "err", text: "Error de conexión" });
    }
  };

  const handleDelete = async (p: Provider) => {
    if (!window.confirm(`¿Eliminar el proveedor "${p.name}"?`)) return;
    setMessage(null);
    try {
      await run(`${API_URL}/providers/${p.id}`, { method: "DELETE" });
      await load();
      await refreshModels();
      setMessage({ kind: "ok", text: `${p.name} eliminado` });
    } catch {
      setMessage({ kind: "err", text: "Error al eliminar" });
    }
  };

  return (
    <CellaDialog
      open={open}
      onClose={() => setOpen(false)}
      title="Modelos e IA"
      maxWidth="620px"
    >
      <div className="space-y-4">
        <p className="text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] leading-relaxed">
          Conecta Ollama (local) o un proveedor con tu API key. Todo se guarda
          cifrado en tu máquina.
        </p>

        {message && (
          <div
            className={`text-(length:--zen-fs-secondary) px-3 py-2 rounded-lg border ${
              message.kind === "ok"
                ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
                : "text-red-400 border-red-500/30 bg-red-500/5"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          {providers.map((p) => (
            <div
              key={p.id}
              className="border border-[var(--outline-variant)] rounded-lg p-3 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-(length:--zen-fs-heading) font-semibold text-[var(--on-surface)]">{p.name}</span>
                  {p.is_default && (
                    <span className="flex items-center gap-0.5 text-(length:--zen-fs-label) text-[var(--primary-fixed)] bg-[var(--primary-fixed)]/10 px-1.5 py-0.5 rounded-full">
                      <Star className="w-2 h-2" /> default
                    </span>
                  )}
                </div>
                <p className="text-(length:--zen-fs-label) text-[var(--on-surface-variant)]/60 truncate">
                  {p.label}
                  {p.base_url ? ` · ${p.base_url}` : ""}
                  {p.has_api_key ? "" : " · sin API key"}
                </p>
                <p className="text-(length:--zen-fs-label) text-[var(--on-surface-variant)] truncate">
                  {p.models.length > 0 ? p.models.join(", ") : "Sin modelos — sincroniza"}
                </p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => handleTest(p)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-(length:--zen-fs-label) text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)] transition-colors"
                >
                  <Zap className="w-2.5 h-2.5" /> Probar
                </button>
                <button
                  onClick={() => handleSync(p)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-(length:--zen-fs-label) text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)] transition-colors"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Sync
                </button>
                {!p.is_default && (
                  <button
                    onClick={() => handleDefault(p)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-(length:--zen-fs-label) text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)] transition-colors"
                  >
                    <Star className="w-2.5 h-2.5" /> Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(p)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-(length:--zen-fs-label) text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-2.5 h-2.5" /> Eliminar
                </button>
              </div>
            </div>
          ))}

          {!loading && providers.length === 0 && (
            <p className="text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)]/60 text-center py-4">
              No hay proveedores configurados todavía.
            </p>
          )}
        </div>

        {/* Add form */}
        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-[var(--outline-variant)] text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:border-[var(--primary-fixed)]/40 transition-colors"
          >
            <Plus className="w-3 h-3" /> Añadir proveedor
          </button>
        ) : (
          <div className="border border-[var(--outline-variant)] rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-(length:--zen-fs-label) text-[var(--on-surface-variant)]/60 block mb-1">Nombre</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ej. mi-ollama"
                  className="w-full text-(length:--zen-fs-secondary) bg-[var(--surface-container-high)]/50 border border-[var(--outline-variant)] rounded-md px-2 py-1.5 outline-none focus:border-[var(--primary-fixed)]/50"
                />
              </div>
              <div>
                <label className="text-(length:--zen-fs-label) text-[var(--on-surface-variant)]/60 block mb-1">Proveedor</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full text-(length:--zen-fs-secondary) bg-[var(--surface-container-high)]/50 border border-[var(--outline-variant)] rounded-md px-2 py-1.5 outline-none focus:border-[var(--primary-fixed)]/50"
                >
                  <option value="ollama">Ollama (local)</option>
                  {Object.entries(catalog).map(([key, entry]) => (
                    <option key={key} value={key}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {newType === "openai_compat" && (
              <div>
                <label className="text-(length:--zen-fs-label) text-[var(--on-surface-variant)]/60 block mb-1">Base URL (ej. LM Studio http://localhost:1234/v1)</label>
                <input
                  value={newBaseUrl}
                  onChange={(e) => setNewBaseUrl(e.target.value)}
                  placeholder="http://localhost:1234/v1"
                  className="w-full text-(length:--zen-fs-secondary) bg-[var(--surface-container-high)]/50 border border-[var(--outline-variant)] rounded-md px-2 py-1.5 outline-none focus:border-[var(--primary-fixed)]/50"
                />
              </div>
            )}

            {newType !== "ollama" && (
              <div>
                <label className="text-(length:--zen-fs-label) text-[var(--on-surface-variant)]/60 block mb-1">API key</label>
                <input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full text-(length:--zen-fs-secondary) bg-[var(--surface-container-high)]/50 border border-[var(--outline-variant)] rounded-md px-2 py-1.5 outline-none focus:border-[var(--primary-fixed)]/50"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={saving || !newName.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-(length:--zen-fs-secondary) bg-[var(--primary-fixed)] text-white disabled:opacity-40 hover:bg-[var(--primary-fixed)] transition-colors"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
                Guardar
              </button>
              <button
                onClick={() => setAdding(false)}
                className="px-3 py-1.5 rounded-md text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </CellaDialog>
  );
}
