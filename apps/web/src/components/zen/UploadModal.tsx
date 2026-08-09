"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { withCsrfHeaders } from "@/lib/csrf";
import CellaDialog from "./CellaDialog";
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

export default function UploadModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (doc: ZenDocument) => void;
}) {
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
      const f = e.dataTransfer.files[0];
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

      setTimeout(() => {
        onComplete(doc);
      }, 500);
    } catch (err: any) {
      clearInterval(interval);
      setUploading(false);
      setProgress(0);
      toast.error(err.message || "Error al subir");
    }
  };

  return (
    <CellaDialog open onClose={onClose} title="Subir documento" maxWidth="480px">
      <div className="p-1">
        {!uploading && !file && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-[var(--primary-fixed)] bg-[var(--primary-fixed)]/5"
                : "border-[var(--outline-variant)] hover:border-[var(--on-surface-variant)]"
            }`}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-[var(--on-surface-variant)] mx-auto mb-3" />
            <p className="text-(length:--zen-fs-body) text-[var(--on-surface)] font-medium mb-1">
              Arrastra tu archivo aquí
            </p>
            <p className="font-label-mono text-(length:--zen-fs-label) text-[var(--on-surface-variant)]">
              o haz clic para seleccionar · PDF, DOCX, PPTX, TXT · Máx 30MB
            </p>
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
          </div>
        )}

        {file && !uploading && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-container-high)] border border-[var(--outline-variant)]">
              <FileText className="w-8 h-8 text-[var(--primary-fixed)]" />
              <div className="flex-1 min-w-0">
                <p className="text-(length:--zen-fs-body) font-medium text-[var(--on-surface)] truncate">
                  {file.name}
                </p>
                <p className="font-label-mono text-(length:--zen-fs-label) text-[var(--on-surface-variant)]">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="p-1 rounded hover:bg-[var(--surface-container-lowest)] text-[var(--on-surface-variant)]"
                aria-label="Quitar archivo"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              onClick={handleUpload}
              className="w-full py-2.5 rounded-xl bg-[var(--gradient-zen-glow)] text-[#003739] text-(length:--zen-fs-body) font-medium hover:shadow-glow transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Subir ahora
            </button>
          </div>
        )}

        {uploading && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-[var(--primary-fixed)] animate-spin" />
              <div className="flex-1 min-w-0">
                <p className="text-(length:--zen-fs-body) font-medium text-[var(--on-surface)]">
                  {progress >= 100 ? "Procesando..." : "Subiendo..."}
                </p>
                <div className="w-full h-1.5 rounded-full bg-[var(--surface-container-high)] mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--gradient-zen-glow)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-(length:--zen-fs-secondary)">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    </CellaDialog>
  );
}
