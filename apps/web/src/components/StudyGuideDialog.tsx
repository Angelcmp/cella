"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { withCsrfHeaders } from "@/lib/csrf";
import { toast } from "sonner";
import { Loader2, FileDown, Clipboard, Sparkles } from "lucide-react";

interface StudyGuideDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  defaultPages?: { start: number; end: number };
}

type GuideFormat = "markdown" | "json";

export default function StudyGuideDialog({ open, onClose, documentId, documentTitle, defaultPages }: StudyGuideDialogProps) {
  const [startPage, setStartPage] = useState<string>("");
  const [endPage, setEndPage] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [format, setFormat] = useState<GuideFormat>("markdown");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultMd, setResultMd] = useState<string>("");
  const [resultJson, setResultJson] = useState<any>(null);
  const [pagesUsed, setPagesUsed] = useState<{start:number; end:number} | null>(null);
  // Export de PDF/DOCX/TXT deshabilitado por pedido: solo descarga .md

  const resetState = () => {
    setResultMd("");
    setResultJson(null);
    setPagesUsed(null);
  };

  // Apply default pages when opening
  useEffect(() => {
    if (open && defaultPages) {
      if (!startPage) setStartPage(String(defaultPages.start));
      if (!endPage) setEndPage(String(defaultPages.end));
    }
  }, [open, defaultPages]);

  const generateGuide = async () => {
    setIsGenerating(true);
    resetState();
    try {
      const body: any = {
        format: 'markdown',
      };
      const s = parseInt(startPage, 10);
      const e = parseInt(endPage, 10);
      if (!isNaN(s) && !isNaN(e)) {
        body.pages = { start: s, end: e };
      }
      if (query && query.trim().length > 0) {
        body.query = query.trim();
      }

      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}/study-guide`, withCsrfHeaders({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(body),
      }));

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({} as any));
        throw new Error(err?.detail || "No se pudo generar la guía de estudio");
      }
      const data = await resp.json();
      if (!data.success) {
        throw new Error(data.error || "La IA no pudo generar la guía");
      }
      if (data.pages_used) {
        setPagesUsed(data.pages_used);
      }
      if (data.markdown) {
        setResultMd(data.markdown);
      } else if (data.guide) {
        setResultJson(data.guide);
      } else if (data.guide && format === "markdown") {
        // Si vino JSON pero se pidió markdown, hacemos un markdown básico
        setResultMd(`# ${data.guide.title || 'Guía de estudio'}\n\n` + JSON.stringify(data.guide, null, 2));
      } else {
        // fallback
        setResultMd("No hay contenido para mostrar.");
      }
      toast.success("Guía generada");
    } catch (e: any) {
      toast.error(e?.message || "Error generando la guía");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      const txt = format === "markdown" ? resultMd : JSON.stringify(resultJson, null, 2);
      await navigator.clipboard.writeText(txt);
      toast.success("Copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const download = () => {
    // Siempre descargar como .md
    const content = resultMd || `# Guía de estudio\n\n${JSON.stringify(resultJson, null, 2)}`;
    const ext = "md";
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = (documentTitle || "guia").replace(/[^a-zA-Z0-9-_]+/g, "_");
    a.download = `${base}_study_guide.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const hasResult = !!resultMd || !!resultJson;

  const exportArtifact = async () => {
    if (!hasResult) {
      toast.error('Primero genera la guía');
      return;
    }
    setExporting(true);
    try {
      const body = {
        document_id: documentId,
        artifact_type: 'study_guide',
        export_type: exportFormat,
        source_format: format,
        title: `Guia_estudio_${documentTitle}`,
        content: format === 'markdown' ? resultMd : resultJson,
      };
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/exports/artifacts/export`, withCsrfHeaders({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      }));
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({} as any));
        throw new Error(err?.detail || 'No se pudo exportar');
      }
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Fallo en exportación');
      setLastExport({ filename: data.filename, downloadUrl: data.download_url, exportType: exportFormat });
      const downloadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${data.download_url}`, { method: 'GET', credentials: 'include' });
      if (!downloadResponse.ok) throw new Error('Error al descargar el archivo');
      const blob = await downloadResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exportado como ${data.filename}`);
    } catch (e:any) {
      toast.error(e?.message || 'Error en exportación');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl glass-panel rounded-[16px] border border-[var(--border-subtle)] shadow-soft text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>Generar Guía de Estudio</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            Documento: <span className="font-medium">{documentTitle}</span>
            {pagesUsed && (
              <span className="ml-2 text-secondary">• Rango usado: pág. {pagesUsed.start}–{pagesUsed.end}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start">Página inicio (opcional)</Label>
              <input id="start" type="number" min={1} value={startPage} onChange={(e) => setStartPage(e.target.value)} className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Página fin (opcional)</Label>
              <input id="end" type="number" min={1} value={endPage} onChange={(e) => setEndPage(e.target.value)} className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="focus">Enfoque (opcional)</Label>
            <textarea id="focus" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej: enfatizar definiciones y fórmulas de la sección X" className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {/* Formato fijo a Markdown para descarga */}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { resetState(); onClose(); }} className="border-border text-foreground hover:bg-muted">Cerrar</Button>
            <Button onClick={generateGuide} disabled={isGenerating} variant="gradient" className="hover-lift">
              {isGenerating ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>) : (<>Generar</>)}
            </Button>
          </div>

          {hasResult && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-secondary">Resultado</p>
                <div className="flex gap-2 items-center">
                  <Button size="sm" variant="outline" onClick={copyToClipboard} className="border-border text-foreground hover:bg-muted"><Clipboard className="h-4 w-4 mr-2"/>Copiar</Button>
                  <Button size="sm" onClick={download} variant="gradient" className="hover-lift"><FileDown className="h-4 w-4 mr-2"/>Descargar .md</Button>
                </div>
              </div>

              {format === 'markdown' ? (
                <pre className="bg-muted/50 p-3 rounded-lg whitespace-pre-wrap text-sm max-h-96 overflow-auto">{resultMd}</pre>
              ) : (
                <pre className="bg-muted/50 p-3 rounded-lg whitespace-pre-wrap text-sm max-h-96 overflow-auto">{JSON.stringify(resultJson, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
