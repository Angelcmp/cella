"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  ArrowUp,
  Paperclip,
  Mic,
  Terminal,
  ChevronDown,
  Check,
  Loader2,
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
    <div className="flex-shrink-0 px-3 pb-2 bg-[var(--zen-read-bg)]">
      <div className="max-w-[792px] mx-auto bg-[var(--zen-read-bg)]">
        <div className="bg-[var(--zen-read-bg)] rounded-xl p-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] focus-within:shadow-[0_4px_16px_rgba(84,153,181,0.15)] transition-shadow duration-300">
          <div className="flex items-center justify-between px-1.5 pt-0.5 pb-1">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setModelOpen(!modelOpen)}
                className="flex items-center gap-1.5 bg-[var(--surface-container-high)]/50 rounded px-1.5 py-0.5 hover:bg-[var(--surface-container-high)] transition-colors"
                title="Seleccionar modelo"
              >
                <span className="w-1 h-1 rounded-full bg-[var(--primary-fixed)] shadow-[0_0_6px_rgba(84,153,181,1)]" />
                <span className="font-label-mono text-(length:--zen-fs-label) text-[var(--on-surface)] tracking-wide">
                  Model::{currentModel?.name || (models.length === 0 ? "Sin modelo" : "Seleccionar")}
                </span>
                <ChevronDown className={`w-2.5 h-2.5 text-[var(--on-surface-variant)] transition-transform ${modelOpen ? "rotate-180" : ""}`} />
              </button>

              {modelOpen && (
                <div className="absolute bottom-full left-0 mb-1 w-72 max-h-80 overflow-y-auto rounded-lg border border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] shadow-xl py-1 z-50">
                  {models.length === 0 ? (
                    <div className="px-3 py-2 space-y-1.5">
                      <p className="font-label-mono text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] leading-snug">
                        No hay modelos configurados. Añade Ollama o una API key en Ajustes.
                      </p>
                      <button
                        onClick={() => {
                          setModelOpen(false);
                          setModelsModalOpen(true);
                        }}
                        className="w-full text-left font-label-mono text-(length:--zen-fs-secondary) text-[var(--primary-fixed)] hover:underline"
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
                              <span className="font-label-mono text-(length:--zen-fs-label) uppercase tracking-wider text-[var(--on-surface)]">
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
                                className={`w-full flex items-center gap-1.5 pl-7 pr-3 py-1.5 font-label-mono text-(length:--zen-fs-secondary) transition-colors ${
                                  selectedModel === m.id
                                    ? "text-[var(--primary-fixed)] bg-[var(--primary)]/5"
                                    : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)]"
                                }`}
                              >
                                <span className="flex-1 text-left truncate">{m.name}</span>
                                {selectedModel === m.id && <Check className="w-3 h-3 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                      <div className="border-t border-[var(--outline-variant)]/20 pt-1 mt-1">
                        <button
                          onClick={() => {
                            setModelOpen(false);
                            setModelsModalOpen(true);
                          }}
                          className="w-full flex items-center gap-1.5 px-3 py-1.5 font-label-mono text-(length:--zen-fs-label) text-[var(--primary-fixed)] hover:bg-[var(--primary)]/5"
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

            <div className="flex items-center gap-0.5">
              <button
                onClick={onUpload}
                className="p-1 rounded-md text-[var(--on-surface-variant)]/60 hover:bg-[var(--surface-container-high)] hover:text-[var(--primary)] transition-colors flex items-center justify-center"
                title="Adjuntar archivo"
              >
                <Paperclip className="w-3 h-3" />
              </button>
              <button
                className="p-1 rounded-md text-[var(--on-surface-variant)]/60 hover:bg-[var(--surface-container-high)] hover:text-[var(--primary)] transition-colors flex items-center justify-center"
                title="Entrada de voz"
              >
                <Mic className="w-3 h-3" />
              </button>
              <button
                className="p-1 rounded-md text-[var(--on-surface-variant)]/60 hover:bg-[var(--surface-container-high)] hover:text-[var(--primary)] transition-colors flex items-center justify-center"
                title="Comandos rápidos"
              >
                <Terminal className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-1.5 pb-0.5">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              rows={1}
              className="flex-1 w-full bg-transparent zen-textarea py-1.5 zen-text-body zen-read-text placeholder:text-[var(--on-surface-variant)]/50 placeholder:font-label-mono max-h-[200px] overflow-y-auto leading-snug [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            />
            <button
              onClick={isLoading && onStop ? onStop : handleSend}
              disabled={!isLoading && (!message.trim() || isLoading)}
              title={isLoading && onStop ? "Detener respuesta" : "Enviar"}
              className={
                isLoading && onStop
                  ? "shrink-0 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 hover:scale-105 transition-all duration-200 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                  : "shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] text-[var(--on-primary)] flex items-center justify-center hover:shadow-[0_0_12px_rgba(84,153,181,0.35)] hover:scale-105 transition-all duration-300 disabled:opacity-40 disabled:hover:scale-100"
              }
            >
              {isLoading && onStop ? (
                <Square className="h-3 w-3 fill-current" />
              ) : isLoading ? (
                <Loader2 className="w-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
