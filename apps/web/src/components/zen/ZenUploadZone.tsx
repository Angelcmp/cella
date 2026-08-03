"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { withCsrfHeaders } from "@/lib/csrf";
import type { ZenDocument } from "./store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_SIZE = 30 * 1024 * 1024;
const ALLOWED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/msword",
];

interface ZenUploadZoneProps {
  onComplete: (doc: ZenDocument) => void;
  className?: string;
  compact?: boolean;
}

export default function ZenUploadZone({
  onComplete,
  className = "",
  compact = false,
}: ZenUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setError("");
    if (!ALLOWED.includes(f.type)) {
      setError("Formato no soportado. Usa PDF, DOCX, PPTX o TXT.");
      return;
    }
    if (f.size > MAX_SIZE) {
      setError("El archivo excede 30 MB.");
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const f = e.clipboardData.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 20, 90));
    }, 300);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: withCsrfHeaders().headers,
      });

      clearInterval(interval);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Error al subir el documento");
      }

      setProgress(100);
      const data = await res.json();

      const doc: ZenDocument = {
        id: data.id || crypto.randomUUID(),
        title: data.title || file.name.replace(/\.[^.]+$/, ""),
        filename: data.filename || file.name,
        status: data.status || "processing",
        pages: data.pages || 0,
        size: file.size,
        createdAt: new Date().toISOString(),
      };

      toast.success("Documento subido correctamente");
      onComplete(doc);
    } catch (err) {
      clearInterval(interval);
      setUploading(false);
      setProgress(0);
      const message = err instanceof Error ? err.message : "Error al subir";
      setError(message);
      toast.error(message);
    }
  };

  const reset = () => {
    setFile(null);
    setUploading(false);
    setProgress(0);
    setError("");
  };

  if (uploading) {
    return (
      <div
        className={`flex items-center justify-center gap-3 p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] ${className}`}
      >
        <Loader2 className="w-5 h-5 text-[var(--accent-primary)] animate-spin" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {progress >= 100 ? "Procesando..." : "Subiendo..."}
          </p>
          <div className="w-full h-1.5 rounded-full bg-[var(--bg-muted)] mt-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (file) {
    return (
      <div
        className={`p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4 ${className}`}
      >
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-muted)]">
          <FileText className="w-8 h-8 text-[var(--accent-primary)]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {file.name}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <button
            onClick={reset}
            className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={handleUpload}
          className="w-full py-2.5 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Subir ahora
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => inputRef.current?.click()}
      onPaste={handlePaste}
      tabIndex={0}
      className={`relative border-2 border-dashed rounded-2xl text-center transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
        dragOver
          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
          : "border-[var(--border-subtle)] hover:border-[var(--text-muted)]"
      } ${className}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.pptx,.txt,.doc"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <div className={compact ? "p-6" : "p-10 md:p-14"}>
        <Upload
          className={`text-[var(--text-muted)] mx-auto mb-3 ${
            compact ? "w-6 h-6" : "w-10 h-10"
          }`}
        />
        <p
          className={`text-[var(--text-primary)] font-medium mb-1 ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          Arrastra tu archivo aquí
        </p>
        <p className={`text-[var(--text-muted)] ${compact ? "text-[10px]" : "text-xs"}`}>
          o haz clic / pega (Ctrl+V) · PDF, DOCX, PPTX, TXT · Máx 30MB
        </p>
      </div>
      {error && (
        <div className="absolute bottom-0 left-0 right-0 m-2 flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
