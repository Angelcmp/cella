"use client";

import { AlertTriangle, Plus, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import AddProviderWizard from "./AddProviderWizard";
import CellaDialog from "./CellaDialog";
import EditProviderModal from "./EditProviderModal";
import ProviderCard from "./ProviderCard";
import { useZenStore, type ProviderConfig } from "./store";

type Tab = "providers" | "models" | "advanced";

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "ahora";
  if (ms < 3_600_000) return `hace ${Math.round(ms / 60_000)} min`;
  if (ms < 86_400_000) return `hace ${Math.round(ms / 3_600_000)} h`;
  if (ms < 7 * 86_400_000) return `hace ${Math.round(ms / 86_400_000)} d`;
  return new Date(iso).toLocaleDateString();
}

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded bg-[var(--surface-container)]/40 p-2">
      <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--on-surface-variant)]">
        {label}
      </div>
      <div className="mt-0.5 text-[length:var(--zen-fs-title)] font-semibold text-[var(--on-surface)]">
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 font-mono text-[9px] text-[var(--on-surface-variant)]">{sub}</div>
      )}
    </div>
  );
}

export default function ProviderSettingsModal() {
  const open = useZenStore((s) => s.modelsModalOpen);
  const setOpen = useZenStore((s) => s.setModelsModalOpen);
  const refreshModels = useZenStore((s) => s.refreshModels);

  const providers = useZenStore((s) => s.providers);
  const providersLoading = useZenStore((s) => s.providersLoading);
  const providerCatalog = useZenStore((s) => s.providerCatalog);
  const refreshProviders = useZenStore((s) => s.refreshProviders);
  const refreshCatalog = useZenStore((s) => s.refreshCatalog);
  const deleteProvider = useZenStore((s) => s.deleteProvider);
  const testSavedProvider = useZenStore((s) => s.testSavedProvider);
  const syncProviderModels = useZenStore((s) => s.syncProviderModels);
  const setDefaultProvider = useZenStore((s) => s.setDefaultProvider);
  const usageStats = useZenStore((s) => s.usageStats);
  const usageStatsLoading = useZenStore((s) => s.usageStatsLoading);
  const refreshUsageStats = useZenStore((s) => s.refreshUsageStats);

  const [tab, setTab] = useState<Tab>("providers");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<ProviderConfig | null>(null);

  useEffect(() => {
    if (open) {
      refreshProviders();
      refreshCatalog();
      refreshUsageStats();
    }
  }, [open, refreshProviders, refreshCatalog, refreshUsageStats]);

  const groupedModels = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    providers.forEach((p) => {
      const list = map.get(p.name) ?? [];
      p.models.forEach((m) => {
        if (!list.find((x) => x.id === m)) {
          list.push({ id: m, name: m });
        }
      });
      map.set(p.name, list);
    });
    return Array.from(map.entries());
  }, [providers]);

  const handleDelete = async (p: ProviderConfig) => {
    const ok = window.confirm(
      `¿Eliminar el proveedor "${p.label}"?\n\nLas conversaciones históricas que dependan de él no se borrarán, pero el chat fallará hasta que configures un reemplazo.`
    );
    if (!ok) return;
    const result = await deleteProvider(p.id);
    if (result.ok) {
      toast.success("Proveedor eliminado");
    } else {
      toast.error(result.error ?? "Error");
    }
  };

  return (
    <>
      <CellaDialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="780px"
        title={
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[var(--primary-fixed)]" />
            <span>Modelos e IA</span>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-[length:var(--zen-fs-body)] text-[var(--on-surface-variant)]">
            Conecta Ollama (local) o un proveedor con tu API key. Todo se guarda cifrado en tu máquina.
          </p>

          <div className="flex items-center gap-1 border-b border-[var(--border-subtle)]">
            {(
              [
                { key: "providers", label: `Proveedores (${providers.length})` },
                { key: "models", label: "Modelos" },
                { key: "advanced", label: "Avanzado" },
              ] as { key: Tab; label: string }[]
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 px-3 py-1.5 font-label-mono text-[length:var(--zen-fs-label)] uppercase tracking-wider transition-colors ${
                  tab === t.key
                    ? "border-[var(--primary-fixed)] text-[var(--primary-fixed)]"
                    : "border-transparent text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "providers" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-label-mono text-[length:var(--zen-fs-secondary)] text-[var(--on-surface-variant)]">
                  {providersLoading
                    ? "Cargando…"
                    : providers.length === 0
                    ? "No hay proveedores configurados."
                    : `${providers.length} configurado${providers.length === 1 ? "" : "s"}`}
                </p>
                <button
                  type="button"
                  onClick={() => setWizardOpen(true)}
                  className="flex items-center gap-1 rounded-md bg-[var(--primary-fixed)]/90 px-3 py-1.5 font-label-mono text-[length:var(--zen-fs-label)] uppercase tracking-wider text-white hover:bg-[var(--primary-fixed)]"
                >
                  <Plus className="h-3 w-3" /> Añadir
                </button>
              </div>

              {!providersLoading && providers.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--outline-variant)]/40 bg-[var(--surface-container)]/30 p-6 text-center">
                  <p className="font-label-mono text-[length:var(--zen-fs-secondary)] text-[var(--on-surface)]">
                    Empieza añadiendo un proveedor
                  </p>
                  <p className="mt-1 text-[length:var(--zen-fs-secondary)] text-[var(--on-surface-variant)]">
                    Ollama para uso local sin API key, o cualquier proveedor con tu clave.
                  </p>
                  <button
                    type="button"
                    onClick={() => setWizardOpen(true)}
                    className="mt-3 inline-flex items-center gap-1 rounded-md bg-[var(--primary-fixed)]/90 px-3 py-1.5 font-label-mono text-[length:var(--zen-fs-label)] uppercase tracking-wider text-white hover:bg-[var(--primary-fixed)]"
                  >
                    <Plus className="h-3 w-3" /> Configurar el primero
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {providers.map((p) => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    catalog={providerCatalog[p.provider_type]}
                    onEdit={() => setEditProvider(p)}
                    onDelete={() => handleDelete(p)}
                    onTest={async () => {
                      const res = await testSavedProvider(p.id);
                      if (!res.ok) toast.error(res.error ?? "Error");
                      else
                        toast.success(
                          `Conectado en ${res.latency_ms ?? "?"}ms`
                        );
                    }}
                    onSync={async () => {
                      const res = await syncProviderModels(p.id);
                      if (!res.ok) toast.error(res.error ?? "Error");
                      else
                        toast.success(
                          `${res.models?.length ?? 0} modelos disponibles`
                        );
                    }}
                    onSetDefault={async () => {
                      const res = await setDefaultProvider(p.id);
                      if (!res.ok) toast.error(res.error ?? "Error");
                      else toast.success("Marcado como default");
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {tab === "models" && (
            <div className="space-y-3">
              <p className="font-label-mono text-[length:var(--zen-fs-secondary)] text-[var(--on-surface-variant)]">
                {providers.length === 0
                  ? "Configura un proveedor para ver los modelos disponibles."
                  : `${groupedModels.reduce((acc, [, ms]) => acc + ms.length, 0)} modelos en ${groupedModels.length} proveedores`}
              </p>
              {groupedModels.map(([providerName, models]) => {
                const provider = providers.find((p) => p.name === providerName);
                return (
                  <div
                    key={providerName}
                    className="rounded-lg border border-[var(--outline-variant)]/40 bg-[var(--surface-container-low)]/60 p-3"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-label-mono text-[length:var(--zen-fs-heading)] font-semibold text-[var(--on-surface)]">
                        {provider?.label ?? providerName}
                      </span>
                      {provider?.is_default && (
                        <span className="rounded bg-[var(--primary-fixed)]/15 px-1.5 py-px font-label-mono text-[9px] uppercase tracking-wider text-[var(--primary-fixed)]">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {models.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded bg-[var(--surface-container)]/40 px-2 py-1 font-mono text-[10px] text-[var(--on-surface-variant)]"
                        >
                          <span className="truncate">{m.id}</span>
                          {m.id === provider?.default_model && (
                            <span className="ml-2 font-label-mono text-[9px] text-[var(--primary-fixed)]">
                              ★
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  refreshModels();
                  refreshProviders();
                  toast.success("Lista actualizada");
                }}
                className="rounded-md bg-[var(--surface-container-high)]/50 px-3 py-1.5 font-label-mono text-[length:var(--zen-fs-label)] uppercase tracking-wider text-[var(--on-surface)] hover:bg-[var(--surface-container-high)]"
              >
                Refrescar desde backend
              </button>
            </div>
          )}

          {tab === "advanced" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-[var(--outline-variant)]/40 bg-[var(--surface-container-low)]/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-label-mono text-[length:var(--zen-fs-heading)] font-semibold text-[var(--on-surface)]">
                    Uso
                  </h4>
                  <button
                    type="button"
                    onClick={() => refreshUsageStats()}
                    disabled={usageStatsLoading}
                    className="rounded-md bg-[var(--surface-container-high)]/50 px-2 py-0.5 font-label-mono text-[length:var(--zen-fs-label)] uppercase tracking-wider text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] disabled:opacity-50"
                  >
                    {usageStatsLoading ? "…" : "Refrescar"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <StatTile
                    label="Conversaciones"
                    value={usageStats?.conversations_total ?? 0}
                  />
                  <StatTile
                    label="Mensajes"
                    value={usageStats?.messages_total ?? 0}
                    sub={
                      usageStats
                        ? `${usageStats.messages_by_role.user} user · ${usageStats.messages_by_role.assistant} ai`
                        : "—"
                    }
                  />
                  <StatTile
                    label="Tokens estimados"
                    value={(usageStats?.tokens_estimated_total ?? 0).toLocaleString()}
                    sub={
                      usageStats
                        ? `${usageStats.tokens_from_messages.toLocaleString()} chat · ${usageStats.tokens_from_summaries.toLocaleString()} summary`
                        : "—"
                    }
                  />
                  <StatTile
                    label="Última actividad"
                    value={
                      usageStats?.last_activity_at
                        ? timeAgo(usageStats.last_activity_at)
                        : "—"
                    }
                  />
                </div>
              </div>

              <div className="rounded-lg border border-[var(--outline-variant)]/40 bg-[var(--surface-container-low)]/60 p-3">
                <h4 className="font-label-mono text-[length:var(--zen-fs-heading)] font-semibold text-[var(--on-surface)]">
                  Modelos usados
                </h4>
                {!usageStats || usageStats.models_used.length === 0 ? (
                  <p className="mt-2 font-label-mono text-[length:var(--zen-fs-secondary)] text-[var(--on-surface-variant)]">
                    Aún no hay mensajes de asistente registrados.
                  </p>
                ) : (
                  <div className="mt-2 space-y-1">
                    {usageStats.models_used.map((m) => (
                      <div
                        key={m.model}
                        className="flex items-center justify-between rounded bg-[var(--surface-container)]/40 px-2 py-1.5"
                      >
                        <span className="truncate font-mono text-[10px] text-[var(--on-surface)]">
                          {m.model}
                        </span>
                        <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--on-surface-variant)]">
                          <span>{m.messages} msg</span>
                          <span>~{m.tokens_estimated.toLocaleString()} tok</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-[var(--outline-variant)]/40 bg-[var(--surface-container-low)]/60 p-3">
                <h4 className="font-label-mono text-[length:var(--zen-fs-heading)] font-semibold text-[var(--on-surface)]">
                  Proveedores
                </h4>
                <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[10px] sm:grid-cols-4">
                  <StatTile
                    label="Total"
                    value={providers.length}
                  />
                  <StatTile
                    label="Con API key"
                    value={providers.filter((p) => p.has_api_key).length}
                  />
                  <StatTile
                    label="Default"
                    value={providers.filter((p) => p.is_default).length}
                  />
                  <StatTile
                    label="Embeddings"
                    value={providers.filter((p) => p.use_for_embeddings).length}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-[var(--outline-variant)]/40 bg-[var(--surface-container-low)]/60 p-3">
                <h4 className="font-label-mono text-[length:var(--zen-fs-heading)] font-semibold text-[var(--on-surface)]">
                  Cifrado
                </h4>
                <p className="mt-1 text-[length:var(--zen-fs-secondary)] text-[var(--on-surface-variant)]">
                  Las API keys se cifran con Fernet (AES-128 + HMAC-SHA256) y se guardan en SQLite local.
                </p>
                <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 font-mono text-[10px] text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    La clave de cifrado se deriva de <code className="font-mono">LOCAL_ENCRYPTION_KEY</code> o{" "}
                    <code className="font-mono">SIGNING_SECRET</code>. Rotarla invalida todas las API keys
                    almacenadas (se descifrarán como vacías y los proveedores quedarán sin key).
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CellaDialog>

      <AddProviderWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={() => {
          refreshProviders();
          refreshModels();
        }}
      />

      <EditProviderModal
        open={editProvider !== null}
        provider={editProvider}
        onClose={() => setEditProvider(null)}
        onSaved={() => {
          refreshProviders();
          refreshModels();
        }}
      />
    </>
  );
}