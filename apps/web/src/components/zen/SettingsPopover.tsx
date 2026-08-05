"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Moon,
  Sun,
  BookOpen,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { useZenStore } from "./store";

interface SettingsPopoverProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPopover({ open, onClose }: SettingsPopoverProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const ref = useRef<HTMLDivElement>(null);
  const setModelsModalOpen = useZenStore((s) => s.setModelsModalOpen);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", newTheme === "dark");
      document.documentElement.setAttribute("data-theme", newTheme);
      try {
        localStorage.setItem("cella-theme", newTheme);
      } catch {}
    }
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        ref={ref}
        className="absolute bottom-14 left-3 w-52 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-glow py-1 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">
            Ajustes
          </p>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            )}
            <span>Modo {theme === "dark" ? "claro" : "oscuro"}</span>
          </button>

          <div className="my-1 border-t border-[var(--border-subtle)]" />

          <button
            onClick={() => {
              onClose();
              setModelsModalOpen(true);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            Modelos e IA
          </button>

          <Link
            href="/docs"
            onClick={onClose}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            Documentación
          </Link>

          <Link
            href="/"
            onClick={onClose}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
