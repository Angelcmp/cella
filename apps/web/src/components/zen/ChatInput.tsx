"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Paperclip, ChevronDown, Check, Loader2 } from "lucide-react";
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <div className="flex-shrink-0 px-4 pb-3">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 flex items-end gap-1.5">
          <button
            onClick={onUpload}
            className="self-end p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors shrink-0"
            title="Subir documento"
          >
            <Paperclip className="w-3 h-3" />
          </button>

          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              rows={1}
              className="w-full bg-transparent border-0 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] leading-relaxed resize-none outline-none py-0.5 max-h-[120px]"
            />
          </div>

          <div className="flex items-center gap-0.5 self-end shrink-0">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setModelOpen(!modelOpen)}
                className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
              >
                <span className="max-w-[60px] truncate">
                  {currentModel?.name || (models.length === 0 ? "Sin modelos" : "Modelo")}
                </span>
                <ChevronDown className={`w-2 h-2 transition-transform ${modelOpen ? "rotate-180" : ""}`} />
              </button>

              {modelOpen && (
                <div className="absolute bottom-full right-0 mb-1 w-44 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-glow py-0.5 z-50">
                  {models.length === 0 ? (
                    <div className="px-3 py-2 space-y-1.5">
                      <p className="text-[10px] text-[var(--text-muted)] leading-snug">
                        No hay modelos configurados. Añade Ollama o una API key en Ajustes.
                      </p>
                      <button
                        onClick={() => {
                          setModelOpen(false);
                          setModelsModalOpen(true);
                        }}
                        className="w-full text-left text-[10px] text-[var(--accent-primary)] hover:underline"
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
                        className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] transition-colors ${
                          selectedModel === m.id
                            ? "text-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                        }`}
                      >
                        <span className="flex-1 text-left truncate">{m.name}</span>
                        {selectedModel === m.id && <Check className="w-2.5 h-2.5 shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              className="p-1 rounded-md transition-all shrink-0 disabled:opacity-30 enabled:hover:bg-[var(--bg-muted)] enabled:text-[var(--text-primary)]"
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
