"use client";

import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import CellaDialog from "./CellaDialog";
import { useZenStore, type ProviderConfig, type ProviderTestResult } from "./store";

interface Props {
  open: boolean;
  provider: ProviderConfig | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditProviderModal({ open, provider, onClose, onSaved }: Props) {
  const testProviderConfig = useZenStore((s) => s.testProviderConfig);
  const updateProvider = useZenStore((s) => s.updateProvider);

  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [useForEmbeddings, setUseForEmbeddings] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ProviderTestResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && provider) {
      setBaseUrl(provider.base_url ?? "");
      setApiKey("");
      setModels(provider.models);
      setDefaultModel(provider.default_model ?? provider.models[0] ?? "");
      setUseForEmbeddings(provider.use_for_embeddings);
      setTestResult(null);
    }
  }, [open, provider]);

  if (!provider) return null;

  const isOllama = provider.provider_type === "ollama";
  const isOpenAICompat = provider.provider_type === "openai_compat";

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testProviderConfig({
        name: provider.name,
        provider_type: provider.provider_type,
        base_url: baseUrl || null,
        api_key: apiKey || null,
        models,
        default_model: defaultModel || null,
        is_default: provider.is_default,
        use_for_embeddings: useForEmbeddings,
      });
      setTestResult(result);
    } catch (e) {
      setTestResult({ ok: false, error: String(e) });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateProvider(provider.id, {
        base_url: baseUrl || null,
        api_key: apiKey || null,
        models,
        default_model: defaultModel || null,
        use_for_embeddings: useForEmbeddings,
      });
      if (result.ok) {
        toast.success("Proveedor actualizado");
        onSaved();
        onClose();
      } else {
        toast.error(result.error ?? "Error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <CellaDialog
      open={open}
      onClose={onClose}
      maxWidth="560px"
      title={`Editar · ${provider.label}`}
    >
      <div className="space-y-3">
        {isOpenAICompat && (
          <div>
            <label className="mb-1 block font-label-mono text-[length:var(--zen-fs-secondary)] uppercase tracking-wider text-[var(--on-surface-variant)]">
              Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full rounded-md border border-[var(--outline-variant)] bg-[var(--surface-container-high)]/50 px-3 py-2 text-[length:var(--zen-fs-body)] outline-none focus:border-[var(--primary-fixed)]/50"
            />
          </div>
        )}

        {!isOllama && (
          <div>
            <label className="mb-1 block font-label-mono text-[length:var(--zen-fs-secondary)] uppercase tracking-wider text-[var(--on-surface-variant)]">
              API key {provider.has_api_key && "(deja vacío para mantener la actual)"}
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider.has_api_key ? "••••••••" : "sk-..."}
                className="w-full rounded-md border border-[var(--outline-variant)] bg-[var(--surface-container-high)]/50 px-3 py-2 pr-9 text-[length:var(--zen-fs-body)] outline-none focus:border-[var(--primary-fixed)]/50"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--on-surface-variant)] hover:text-[var(--primary-fixed)]"
                aria-label={showKey ? "Ocultar" : "Mostrar"}
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block font-label-mono text-[length:var(--zen-fs-secondary)] uppercase tracking-wider text-[var(--on-surface-variant)]">
            Modelo por defecto
          </label>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            className="w-full rounded-md border border-[var(--outline-variant)] bg-[var(--surface-container-high)]/50 px-3 py-2 text-[length:var(--zen-fs-body)] outline-none focus:border-[var(--primary-fixed)]/50"
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-md border border-[var(--outline-variant)]/40 bg-[var(--surface-container)]/30 p-2.5">
          <div>
            <p className="font-label-mono text-[length:var(--zen-fs-secondary)] text-[var(--on-surface)]">
              Usar también para embeddings
            </p>
            <p className="font-mono text-[10px] text-[var(--on-surface-variant)]">
              Genera embeddings con este proveedor en vez de local.
            </p>
          </div>
          <input
            type="checkbox"
            checked={useForEmbeddings}
            onChange={(e) => setUseForEmbeddings(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary-fixed)]"
          />
        </label>

        <div className="flex items-center justify-between rounded-md border border-[var(--outline-variant)]/40 bg-[var(--surface-container)]/30 p-2.5">
          <p className="font-mono text-[10px] text-[var(--on-surface-variant)]">
            Prueba en vivo (llamada real a la API)
          </p>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 rounded-md bg-[var(--primary-fixed)]/90 px-3 py-1.5 font-label-mono text-[length:var(--zen-fs-label)] uppercase tracking-wider text-white hover:bg-[var(--primary-fixed)] disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Probar
          </button>
        </div>

        {testResult && (
          <div
            className={`rounded-md border px-3 py-2 text-[length:var(--zen-fs-body)] ${
              testResult.ok
                ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700"
                : "border-red-500/40 bg-red-500/5 text-red-700"
            }`}
          >
            {testResult.ok
              ? `✓ Conectado en ${testResult.latency_ms}ms · ${testResult.response}`
              : `✗ ${testResult.error}`}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1.5 font-label-mono text-[length:var(--zen-fs-label)] uppercase tracking-wider text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 rounded-md bg-[var(--primary-fixed)]/90 px-3 py-1.5 font-label-mono text-[length:var(--zen-fs-label)] uppercase tracking-wider text-white hover:bg-[var(--primary-fixed)] disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Guardar
        </button>
      </div>
    </CellaDialog>
  );
}