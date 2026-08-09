"use client";

import { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Paperclip,
  Mic,
  Terminal,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-react";
import { useZenStore, type ModelId } from "./store";

interface ChatInputProps {
  onSend: (message: string, model: ModelId) => void;
  onUpload: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  onUpload,
  isLoading,
  placeholder = "Pregunta sobre tu documento...",
}: ChatInputProps) {
  const { selectedModel, setSelectedModel, models, setModelsModalOpen } = useZenStore();
  const [message, setMessage] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModel = models.find((m) => m.id === selectedModel);

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
                <div className="absolute bottom-full left-0 mb-1 w-48 rounded-lg border border-[var(--outline-variant)]/30 bg-[var(--surface-container-lowest)] shadow-xl py-1 z-50">
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
                    models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setModelOpen(false);
                        }}
                        className={`w-full flex items-center gap-1.5 px-3 py-2 font-label-mono text-(length:--zen-fs-secondary) transition-colors ${
                          selectedModel === m.id
                            ? "text-[var(--primary-fixed)] bg-[var(--primary)]/5"
                            : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)]"
                        }`}
                      >
                        <span className="flex-1 text-left truncate">{m.name}</span>
                        {selectedModel === m.id && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                    ))
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
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] text-[var(--on-primary)] flex items-center justify-center hover:shadow-[0_0_12px_rgba(84,153,181,0.35)] hover:scale-105 transition-all duration-300 disabled:opacity-40 disabled:hover:scale-100"
              title="Enviar"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
