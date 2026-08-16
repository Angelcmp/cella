"use client";

import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import CellaDialog from "./CellaDialog";
import { useZenStore, type ProviderCatalogEntry, type ProviderTestResult, type ProviderType } from "./store";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_ORDER: ProviderType[] = [
  "ollama",
  "openai",
  "deepseek",
  "zhipu",
  "gemini",
  "anthropic",
  "qwen",
  "moonshot",
  "minimax",
  "openai_compat",
];

const TYPE_ICONS: Record<ProviderType, string> = {
  ollama: "🖥",
  openai: "O",
  deepseek: "D",
  zhipu: "Z",
  gemini: "G",
  anthropic: "A",
  qwen: "Q",
  moonshot: "K",
  minimax: "M",
  openai_compat: "↔",
};

export default function AddProviderWizard({ open, onClose, onSaved }: Props) {
  const providerCatalog = useZenStore((s) => s.providerCatalog);
  const refreshCatalog = useZenStore((s) => s.refreshCatalog);
  const testProviderConfig = useZenStore((s) => s.testProviderConfig);
  const createProvider = useZenStore((s) => s.createProvider);

  const [step, setStep] = useState(0);
  const [providerType, setProviderType] = useState<ProviderType>("openai");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [useForEmbeddings, setUseForEmbeddings] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ProviderTestResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (open && Object.keys(providerCatalog).length === 0) {
      refreshCatalog();
    }
  }, [open, providerCatalog, refreshCatalog]);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setProviderType("openai");
      setName("");
      setBaseUrl("");
      setApiKey("");
      setModels([]);
      setDefaultModel("");
      setUseForEmbeddings(false);
      setTestResult(null);
      setNameError(null);
    }
  }, [open]);

  useEffect(() => {
    const entry = providerCatalog[providerType];
    if (entry) {
      if (!baseUrl || baseUrl === providerCatalog["openai"]?.base_url) {
        setBaseUrl(entry.base_url || "");
      }
      if (entry.models.length && models.length === 0) {
        setModels(entry.models);
        setDefaultModel(entry.models[0]);
      }
    }
  }, [providerType, providerCatalog]); // eslint-disable-line react-hooks/exhaustive-deps

  const catalogEntry: ProviderCatalogEntry | undefined = providerCatalog[providerType];
  const needsKey = catalogEntry?.needs_key ?? true;
  const capabilities = catalogEntry?.capabilities;

  const step0Valid = !!providerType;
  const step1Valid =
    name.trim().length > 0 &&
    (needsKey ? apiKey.trim().length > 0 : true) &&
    (providerType === "openai_compat" ? baseUrl.trim().length > 0 : true) &&
    !nameError;

  const handleNameChange = (v: string) => {
    setName(v);
    if (v.length > 0 && !/^[a-zA-Z0-9_\-]+$/.test(v)) {
      setNameError("Solo letras, números, _ y -");
    } else {
      setNameError(null);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testProviderConfig({
        name: name || "test",
        provider_type: providerType,
        base_url: baseUrl || null,
        api_key: apiKey || null,
        models,
        default_model: defaultModel || null,
        is_default: false,
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
      const result = await createProvider({
        name,
        provider_type: providerType,
        base_url: baseUrl || null,
        api_key: apiKey || null,
        models,
        default_model: defaultModel || null,
        is_default: false,
        use_for_embeddings: useForEmbeddings,
      });
      if (result.ok) {
        toast.success("Proveedor añadido");
        onSaved();
        onClose();
      } else {
        toast.error(result.error ?? "Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <CellaDialog open={open} onClose={onClose} maxWidth="640px" title="Añadir proveedor">
      <div className="flex items-center gap-2 pb-3 font-label-mono text-[length:var(--zen-fs-secondary)] text-[var(--on-surface-variant)]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-[var(--primary-fixed)]" : "bg-[var(--outline-variant)]/40"
            }`}
          />
        ))}
        <span className="ml-2">Paso {step + 1} / 3</span>
      </div>

      {step === 0 && (
        <div>
          <p className="mb-3 text-[length:var(--zen-fs-body)] text-[var(--on-surface-variant)]">
            Elige el tipo de proveedor que quieres configurar.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TYPE_ORDER.map((t) => {
              const entry = providerCatalog[t];
              if (!entry) {
                return null;
              }
              const selected = providerType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setProviderType(t)}
                  className={`flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all ${
                    selected
                      ? "border-[var(--primary-fixed)] bg-[var(--primary-fixed)]/8"
                      : "border-[var(--outline-variant)]/40 hover:border-[var(--primary-fixed)]/40"
                  }`}
                >
                  <span className="font-label-mono text-[10px] uppercase tracking-wider text-[var(--on-surface)]">
                    {TYPE_ICONS[t]} {entry.label}
                  </span>
                  <span className="font-mono text-[9px] text-[var(--on-surface-variant)]">
                    {entry.needs_key ? "API key" : "Sin key · local"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block font-label-mono text-[length:var(--zen-fs-secondary)] uppercase tracking-wider text-[var(--on-surface-variant)]">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="ej. mi-openai"
              className={`w-full rounded-md border bg-[var(--surface-container-high)]/50 px-3 py-2 text-[length:var(--zen-fs-body)] outline-none focus:border-[var(--primary-fixed)]/50 ${
                nameError ? "border-red-500" : "border-[var(--outline-variant)]"
              }`}
            />
            {nameError && (
              <p className="mt-1 font-mono text-[10px] text-red-600">{nameError}</p>
            )}
          </div>

          {providerType === "openai_compat" && (
            <div>
              <label className="mb-1 block font-label-mono text-[length:var(--zen-fs-secondary)] uppercase tracking-wider text-[var(--on-surface-variant)]">
                Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:1234/v1"
                className="w-full rounded-md border border-[var(--outline-variant)] bg-[var(--surface-container-high)]/50 px-3 py-2 text-[length:var(--zen-fs-body)] outline-none focus:border-[var(--primary-fixed)]/50"
              />
            </div>
          )}

          {needsKey && (
            <div>
              <label className="mb-1 block font-label-mono text-[length:var(--zen-fs-secondary)] uppercase tracking-wider text-[var(--on-surface-variant)]">
                API key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
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
              <p className="mt-1 font-mono text-[10px] text-[var(--on-surface-variant)]">
                Se guarda cifrada en tu máquina (Fernet).
              </p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border border-[var(--outline-variant)]/40 bg-[var(--surface-container)]/30 p-2.5">
            <div>
              <p className="font-label-mono text-[length:var(--zen-fs-secondary)] text-[var(--on-surface)]">
                Probar conexión
              </p>
              <p className="font-mono text-[10px] text-[var(--on-surface-variant)]">
                Esta prueba hace una llamada real a la API.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTest}
              disabled={!step1Valid || testing}
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
              {testResult.ok ? (
                <>
                  ✓ Conectado en {testResult.latency_ms}ms · modelo: <span className="font-mono">{testResult.model}</span> · "{testResult.response}"
                </>
              ) : (
                <>✗ {testResult.error}</>
              )}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block font-label-mono text-[length:var(--zen-fs-secondary)] uppercase tracking-wider text-[var(--on-surface-variant)]">
              Modelo por defecto
            </label>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              className="w-full rounded-md border border-[var(--outline-variant)] bg-[var(--surface-container-high)]/50 px-3 py-2 text-[length:var(--zen-fs-body)] outline-none focus:border-[var(--primary-fixed)]/50"
            >
              {(models.length ? models : catalogEntry?.models || []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {capabilities?.has_embeddings && (
            <label className="flex cursor-pointer items-center justify-between rounded-md border border-[var(--outline-variant)]/40 bg-[var(--surface-container)]/30 p-2.5">
              <div>
                <p className="font-label-mono text-[length:var(--zen-fs-secondary)] text-[var(--on-surface)]">
                  Usar también para embeddings
                </p>
                <p className="font-mono text-[10px] text-[var(--on-surface-variant)]">
                  Generará embeddings con este proveedor en vez de local.
                </p>
              </div>
              <input
                type="checkbox"
                checked={useForEmbeddings}
                onChange={(e) => setUseForEmbeddings(e.target.checked)}
                className="h-4 w-4 accent-[var(--primary-fixed)]"
              />
            </label>
          )}

          <div className="rounded-md bg-[var(--surface-container)]/30 p-2.5 font-mono text-[10px] text-[var(--on-surface-variant)]">
            <div>
              Tipo: <span className="text-[var(--on-surface)]">{catalogEntry?.label ?? providerType}</span>
            </div>
            {baseUrl && (
              <div>
                URL: <span className="text-[var(--on-surface)]">{baseUrl}</span>
              </div>
            )}
            <div>
              Nombre: <span className="text-[var(--on-surface)]">{name}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3">
        <button
          type="button"
          onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
          className="flex items-center gap-1 rounded-md px-3 py-1.5 font-label-mono text-[length:var(--zen-fs-label)] uppercase tracking-wider text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
        >
          <ArrowLeft className="h-3 w-3" />
          {step === 0 ? "Cancelar" : "Atrás"}
        </button>

        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={(step === 0 && !step0Valid) || (step === 1 && !step1Valid)}
            className="flex items-center gap-1 rounded-md bg-[var(--primary-fixed)]/90 px-3 py-1.5 font-label-mono text-[length:var(--zen-fs-label)] uppercase tracking-wider text-white hover:bg-[var(--primary-fixed)] disabled:opacity-40"
          >
            Continuar
            <ArrowRight className="h-3 w-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name}
            className="flex items-center gap-1 rounded-md bg-[var(--primary-fixed)]/90 px-3 py-1.5 font-label-mono text-[length:var(--zen-fs-label)] uppercase tracking-wider text-white hover:bg-[var(--primary-fixed)] disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Guardar
          </button>
        )}
      </div>
    </CellaDialog>
  );
}