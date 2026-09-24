"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus,
  ChevronDown,
  Check,
  SlidersHorizontal,
  Square,
} from "lucide-react";
import { useZenStore, type ModelId, type ProviderConfig } from "./store";

interface ChatInputProps {
  onSend: (message: string, model: ModelId) => void;
  onUpload: () => void;
  isLoading: boolean;
  placeholder?: string;
  onStop?: () => void;
}

function healthColor(p: ProviderConfig | undefined): string {
  if (!p || p.last_test_ok === null || p.last_test_ok === undefined) return "bg-zinc-400";
  return p.last_test_ok ? "bg-emerald-500" : "bg-red-500";
}

export default function ChatInput({
  onSend,
  onUpload,
  isLoading,
  placeholder = "Pregunta sobre tu documento...",
  onStop,
}: ChatInputProps) {
  const {
    selectedModel,
    setSelectedModel,
    models,
    setModelsModalOpen,
    providers,
    refreshProviders,
  } = useZenStore();
  const [message, setMessage] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModel = models.find((m) => m.id === selectedModel);

  useEffect(() => {
    if (modelOpen && providers.length === 0) {
      refreshProviders();
    }
  }, [modelOpen, providers.length, refreshProviders]);

  // Build provider-name -> ProviderConfig map for health dots
  const providerByName = useMemo(() => {
    const m = new Map<string, ProviderConfig>();
    providers.forEach((p) => m.set(p.name, p));
    return m;
  }, [providers]);

  // Group models by provider
  const groupedModels = useMemo(() => {
    const map = new Map<string, typeof models>();
    models.forEach((m) => {
      const list = map.get(m.provider) ?? [];
      list.push(m);
      map.set(m.provider, list);
    });
    return Array.from(map.entries());
  }, [models]);

  const handleSend = () => {
    if (!message.trim() || isLoading) return;
    onSend(message.trim(), selectedModel);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelOpen(false);
      }
    };
    if (modelOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [modelOpen]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  return (
    <div className="flex-shrink-0 px-4 pb-4 bg-[var(--zen-read-bg)]">
      <div className="max-w-[792px] mx-auto">
        <div className="bg-[var(--zen-panel)] rounded-3xl border border-[var(--zen-line)] shadow-[0_2px_10px_rgba(11,21,21,0.04)] transition-all duration-200">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className="w-full bg-transparent zen-textarea px-4 pt-3.5 pb-1 zen-text-body zen-read-text placeholder:text-[var(--on-surface-variant)]/50 max-h-[200px] overflow-y-auto leading-snug resize-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          />

          <div className="flex items-center justify-between px-2 pb-2 pt-0.5">
            <button
              onClick={onUpload}
              className="shrink-0 w-8 h-8 rounded-full text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)] hover:text-[var(--on-surface)] transition-colors flex items-center justify-center"
              title="Adjuntar archivo"
            >
              <Plus className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  onClick={() => setModelOpen(!modelOpen)}
                  className="flex items-center gap-1 rounded-full px-2.5 h-7 text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)] hover:text-[var(--on-surface)] transition-colors"
                  title="Seleccionar modelo"
                >
                  <span className="text-(length:--zen-fs-label) font-medium max-w-[160px] truncate">
                    {currentModel?.name || (models.length === 0 ? "Sin modelo" : "Seleccionar")}
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${modelOpen ? "rotate-180" : ""}`} />
                </button>

                {modelOpen && (
                  <div className="absolute bottom-full right-0 mb-1 w-72 max-h-80 overflow-y-auto rounded-lg border border-[var(--zen-line)] bg-[var(--zen-panel)] shadow-[var(--zen-elev-2)] py-1 z-50">
                    {models.length === 0 ? (
                      <div className="px-3 py-2 space-y-1.5">
                        <p className="text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] leading-snug">
                          No hay modelos configurados. Añade Ollama o una API key en Ajustes.
                        </p>
                        <button
                          onClick={() => {
                            setModelOpen(false);
                            setModelsModalOpen(true);
                          }}
                          className="w-full text-left text-(length:--zen-fs-secondary) text-[var(--on-surface)] hover:underline"
                        >
                          Abrir ajustes de modelos →
                        </button>
                      </div>
                    ) : (
                      <>
                        {groupedModels.map(([providerName, providerModels]) => {
                          const prov = providerByName.get(providerName);
                          return (
                            <div key={providerName} className="py-1">
                              <div className="flex items-center gap-1.5 px-3 py-1">
                                <span
                                  className={`inline-block h-1.5 w-1.5 rounded-full ${healthColor(prov)}`}
                                  title={
                                    prov?.last_test_ok === true
                                      ? `OK · ${prov.last_test_latency_ms ?? "?"}ms`
                                      : prov?.last_test_ok === false
                                      ? "Falló"
                                      : "Sin probar"
                                  }
                                />
                                <span className="font-medium text-(length:--zen-fs-label) text-[var(--on-surface)]">
                                  {prov?.label ?? providerName}
                                </span>
                                {prov?.last_test_ok === true && prov.last_test_latency_ms != null && (
                                  <span className="font-mono text-[8px] text-[var(--on-surface-variant)]">
                                    {prov.last_test_latency_ms}ms
                                  </span>
                                )}
                              </div>
                              {providerModels.map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => {
                                    setSelectedModel(m.id);
                                    setModelOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-1.5 pl-7 pr-3 py-1.5 text-(length:--zen-fs-secondary) transition-colors ${
                                    selectedModel === m.id
                                      ? "text-[var(--on-surface)] bg-[var(--zen-hover)]"
                                      : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--zen-hover)]"
                                  }`}
                                >
                                  <span className="flex-1 text-left truncate">{m.name}</span>
                                  {selectedModel === m.id && <Check className="w-3 h-3 shrink-0" />}
                                </button>
                              ))}
                            </div>
                          );
                        })}
                        <div className="border-t border-[var(--zen-line)] pt-1 mt-1">
                          <button
                            onClick={() => {
                              setModelOpen(false);
                              setModelsModalOpen(true);
                            }}
                            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-(length:--zen-fs-label) text-[var(--on-surface)] hover:bg-[var(--zen-hover)]"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            Configurar modelos…
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {isLoading && onStop && (
                <button
                  onClick={onStop}
                  className="shrink-0 flex items-center gap-1 px-2.5 h-7 rounded-full bg-red-500 text-white text-(length:--zen-fs-label) font-medium hover:bg-red-600 transition-colors"
                  title="Detener respuesta"
                >
                  <Square className="h-3 w-3 fill-current" />
                  Detener
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
