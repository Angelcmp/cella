"use client";

import { Pencil, Play, RefreshCw, Star, StarOff, Trash2 } from "lucide-react";
import { useState } from "react";

import { toast } from "sonner";

import CapabilityBadges from "./CapabilityBadges";
import type { ProviderCatalogEntry, ProviderConfig } from "./store";

interface Props {
  provider: ProviderConfig;
  catalog?: ProviderCatalogEntry;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => Promise<void>;
  onSync: () => Promise<void>;
  onSetDefault: () => Promise<void>;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "nunca";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "hace segundos";
  if (ms < 3_600_000) return `hace ${Math.round(ms / 60_000)} min`;
  if (ms < 86_400_000) return `hace ${Math.round(ms / 3_600_000)} h`;
  return `hace ${Math.round(ms / 86_400_000)} d`;
}

export default function ProviderCard({
  provider,
  catalog,
  onEdit,
  onDelete,
  onTest,
  onSync,
  onSetDefault,
}: Props) {
  const [busy, setBusy] = useState<"test" | "sync" | "default" | null>(null);

  const handleAction = async (
    key: "test" | "sync" | "default",
    fn: () => Promise<void>,
    successMsg: string,
    errorPrefix: string
  ) => {
    setBusy(key);
    try {
      await fn();
      toast.success(successMsg);
    } catch (e) {
      toast.error(`${errorPrefix}: ${(e as Error).message ?? e}`);
    } finally {
      setBusy(null);
    }
  };

  const healthDot =
    provider.last_test_ok === true
      ? "bg-emerald-500"
      : provider.last_test_ok === false
      ? "bg-red-500"
      : "bg-zinc-400";

  const healthLabel =
    provider.last_test_ok === true
      ? `OK ${provider.last_test_latency_ms ?? "?"}ms`
      : provider.last_test_ok === false
      ? "Falló"
      : "Sin probar";

  return (
    <div className="rounded-xl border border-[var(--outline-variant)]/40 bg-[var(--surface-container-low)]/60 p-3 transition-all hover:border-[var(--primary-fixed)]/40">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex flex-col items-center gap-1">
          <span
            className={`inline-block h-2 w-2 rounded-full ${healthDot}`}
            title={`${healthLabel}${provider.last_test_error ? ` — ${provider.last_test_error}` : ""}`}
          />
          {provider.last_test_ok === true && provider.last_test_latency_ms != null && (
            <span className="font-label-mono text-[8px] text-[var(--on-surface-variant)]">
              {provider.last_test_latency_ms}ms
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate font-label-mono text-[length:var(--zen-fs-heading)] font-semibold text-[var(--on-surface)]">
              {provider.label}
            </h4>
            {provider.is_default ? (
              <span className="inline-flex items-center gap-0.5 rounded bg-[var(--primary-fixed)]/15 px-1.5 py-px font-label-mono text-[9px] uppercase tracking-wider text-[var(--primary-fixed)]">
                <Star className="h-2.5 w-2.5 fill-current" /> Default
              </span>
            ) : provider.has_api_key ? (
              <span className="rounded bg-emerald-500/10 px-1.5 py-px font-label-mono text-[9px] uppercase tracking-wider text-emerald-700">
                API key
              </span>
            ) : provider.provider_type === "ollama" ? (
              <span className="rounded bg-zinc-500/10 px-1.5 py-px font-label-mono text-[9px] uppercase tracking-wider text-zinc-600">
                Local
              </span>
            ) : (
              <span className="rounded bg-amber-500/10 px-1.5 py-px font-label-mono text-[9px] uppercase tracking-wider text-amber-700">
                Sin key
              </span>
            )}
          </div>

          <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--on-surface-variant)]">
            {provider.base_url || catalog?.base_url || "—"}
          </div>

          <div className="mt-1.5 flex items-center gap-3 font-label-mono text-[length:var(--zen-fs-secondary)] text-[var(--on-surface-variant)]">
            <span>
              {provider.models.length} modelo{provider.models.length === 1 ? "" : "s"}
            </span>
            <span>·</span>
            <span>
              {provider.last_test_at
                ? `Prueba ${timeAgo(provider.last_test_at)} (${healthLabel})`
                : "Nunca probado"}
            </span>
          </div>

          {catalog?.capabilities && (
            <div className="mt-2">
              <CapabilityBadges capabilities={catalog.capabilities} size="sm" />
            </div>
          )}

          {provider.last_test_ok === false && provider.last_test_error && (
            <div className="mt-2 truncate rounded bg-red-500/5 px-2 py-1 font-mono text-[10px] text-red-700">
              {provider.last_test_error}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              handleAction("test", onTest, "Conexión verificada", "Error al probar")
            }
            disabled={busy !== null}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] disabled:opacity-50"
            title="Probar conexión"
            aria-label="Probar conexión"
          >
            {busy === "test" ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
            title="Editar"
            aria-label="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              handleAction(
                "sync",
                onSync,
                provider.provider_type === "ollama"
                  ? "Modelos sincronizados"
                  : "Modelos restablecidos desde el catálogo",
                "Error al sincronizar"
              )
            }
            disabled={busy !== null}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] disabled:opacity-50"
            title={provider.provider_type === "ollama" ? "Sincronizar modelos desde Ollama" : "Restablecer desde catálogo"}
            aria-label="Sincronizar"
          >
            {busy === "sync" ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
          {!provider.is_default && (
            <button
              type="button"
              onClick={() =>
                handleAction("default", onSetDefault, "Marcado como default", "Error")
              }
              disabled={busy !== null}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] disabled:opacity-50"
              title="Marcar como default"
              aria-label="Marcar como default"
            >
              {busy === "default" ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <StarOff className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-500/10"
            title="Eliminar"
            aria-label="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}