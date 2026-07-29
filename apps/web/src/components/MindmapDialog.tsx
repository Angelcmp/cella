"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { withCsrfHeaders } from "@/lib/csrf";
import { toast } from "sonner";
import { Loader2, FileDown, Clipboard, Trees } from "lucide-react";
import MermaidRenderer from "@/components/MermaidRenderer";
import ConceptMapViewer from "@/components/ConceptMapViewer";

interface MindmapDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  defaultPages?: { start: number; end: number };
}

export default function MindmapDialog({ open, onClose, documentId, documentTitle, defaultPages }: MindmapDialogProps) {
  const [startPage, setStartPage] = useState<string>("");
  const [endPage, setEndPage] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultMd, setResultMd] = useState<string>("");
  const [pagesUsed, setPagesUsed] = useState<{start:number; end:number} | null>(null);
  const [detailLevel, setDetailLevel] = useState<'1'|'2'|'3'>('2');
  const [focusMode, setFocusMode] = useState<string>("");
  const [viewMode, setViewMode] = useState<'mermaid'|'concept'>('concept');
  const [metaNodes, setMetaNodes] = useState<any[] | null>(null);
  const [persistZoom, setPersistZoom] = useState<number | undefined>(undefined);

  const reset = () => {
    setResultMd("");
    setPagesUsed(null);
  };

  // Prefill pages when opening
  useEffect(() => {
    if (open && defaultPages) {
      if (!startPage) setStartPage(String(defaultPages.start));
      if (!endPage) setEndPage(String(defaultPages.end));
    }
  }, [open, defaultPages]);

  const generate = async () => {
    setIsGenerating(true);
    reset();
    try {
      const body: any = { detail_level: parseInt(detailLevel,10) };
      const s = parseInt(startPage, 10);
      const e = parseInt(endPage, 10);
      if (!isNaN(s) && !isNaN(e)) body.pages = { start: s, end: e };
      if (query && query.trim()) body.query = query.trim();
      if (focusMode) body.focus_mode = focusMode;
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}/mindmap`, withCsrfHeaders({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      }));
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({} as any));
        throw new Error(err?.detail || 'No se pudo generar el mapa mental');
      }
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Fallo en generación');
      if (data.pages_used) setPagesUsed(data.pages_used);
      setResultMd(data.markdown || '');
      setMetaNodes((data.metadata && data.metadata.nodes) ? data.metadata.nodes : null);
      toast.success('Mapa mental generado');
      // Save persisted settings
      try {
        const key = `docai:mindmap:${documentId}`;
        const payload = {
          detailLevel, focusMode, query, startPage, endPage, viewMode, zoom: persistZoom
        };
        localStorage.setItem(key, JSON.stringify(payload));
      } catch {}
    } catch (e:any) {
      toast.error(e?.message || 'Error generando el mapa');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(resultMd);
      toast.success('Copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const download = () => {
    const content = resultMd || '```mermaid\nmindmap\n  root) Mapa\n```';
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = (documentTitle || 'mapa_mental').replace(/[^a-zA-Z0-9-_]+/g, '_');
    a.download = `${base}_mindmap.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const hasResult = !!resultMd;

  // Load persisted settings per-document when opening
  useEffect(() => {
    if (!open) return;
    try {
      const key = `docai:mindmap:${documentId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj.detailLevel) setDetailLevel(String(obj.detailLevel) as any);
        if (obj.focusMode !== undefined) setFocusMode(String(obj.focusMode));
        if (obj.query !== undefined) setQuery(String(obj.query));
        if (obj.startPage !== undefined) setStartPage(String(obj.startPage));
        if (obj.endPage !== undefined) setEndPage(String(obj.endPage));
        if (obj.viewMode) setViewMode(obj.viewMode === 'mermaid' ? 'mermaid' : 'concept');
        if (typeof obj.zoom === 'number') setPersistZoom(obj.zoom);
      }
    } catch {}
  }, [open, documentId]);

  // Persist control changes
  useEffect(() => {
    try {
      const key = `docai:mindmap:${documentId}`;
      const prev = localStorage.getItem(key);
      const obj = prev ? JSON.parse(prev) : {};
      obj.detailLevel = detailLevel; obj.focusMode = focusMode; obj.query = query; obj.startPage = startPage; obj.endPage = endPage; obj.viewMode = viewMode; obj.zoom = persistZoom;
      localStorage.setItem(key, JSON.stringify(obj));
    } catch {}
  }, [detailLevel, focusMode, query, startPage, endPage, viewMode, persistZoom, documentId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl glass-panel rounded-[16px] border border-[var(--border-subtle)] shadow-soft text-foreground max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trees className="h-5 w-5 text-primary" />
            <span>Generar Mapa Mental</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left controls */}
          <div className="space-y-3 lg:col-span-1">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <div className="font-medium text-foreground/90">{documentTitle}</div>
              {pagesUsed && (
                <div className="text-secondary">Rango usado: pág. {pagesUsed.start}–{pagesUsed.end}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="start" className="text-xs">Pág. inicio</Label>
                <input id="start" type="number" min={1} value={startPage} onChange={(e) => setStartPage(e.target.value)} className="w-full bg-input text-foreground border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end" className="text-xs">Pág. fin</Label>
                <input id="end" type="number" min={1} value={endPage} onChange={(e) => setEndPage(e.target.value)} className="w-full bg-input text-foreground border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Detalle</Label>
                <select value={detailLevel} onChange={(e)=>setDetailLevel(e.target.value as any)} className="w-full bg-input text-foreground border border-border rounded-md px-2 py-1.5 text-sm">
                  <option value="1">Bajo (6 nodos)</option>
                  <option value="2">Medio (10 nodos)</option>
                  <option value="3">Alto (14 nodos)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Enfoque</Label>
                <select value={focusMode} onChange={(e)=>setFocusMode(e.target.value)} className="w-full bg-input text-foreground border border-border rounded-md px-2 py-1.5 text-sm">
                  <option value="">General</option>
                  <option value="definitions">Definiciones</option>
                  <option value="processes">Procesos</option>
                  <option value="actors">Actores/Relaciones</option>
                  <option value="timeline">Línea de tiempo</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="focus" className="text-xs">Enfoque (texto)</Label>
              <textarea id="focus" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej: centrar en conceptos clave de la sección X" className="w-full bg-input text-foreground border border-border rounded-md px-2 py-1.5 text-sm min-h-[64px] focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            <div className="flex justify-between items-center gap-2">
              <Button variant="outline" onClick={() => { reset(); onClose(); }} className="border-border text-foreground hover:bg-muted">Cerrar</Button>
              <Button onClick={generate} disabled={isGenerating} variant="gradient" className="hover-lift">
                {isGenerating ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>) : (<>Generar</>)}
              </Button>
            </div>
          </div>

          {/* Right viewer */}
          <div className="lg:col-span-2 space-y-2">
            {hasResult && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 text-sm text-secondary">
                  <span>Resultado</span>
                  <select value={viewMode} onChange={(e)=>{ setViewMode(e.target.value as any); try { const key = `docai:mindmap:${documentId}`; const prev = localStorage.getItem(key); const obj = prev ? JSON.parse(prev) : {}; obj.viewMode = e.target.value; localStorage.setItem(key, JSON.stringify(obj)); } catch {} }} className="bg-input text-foreground border border-border rounded px-2 py-1 text-xs">
                    <option value="concept">Vista conceptual</option>
                    <option value="mermaid">Vista mermaid</option>
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <Button size="sm" variant="outline" onClick={copyToClipboard} className="border-border text-foreground hover:bg-muted"><Clipboard className="h-4 w-4 mr-2"/>Copiar</Button>
                  <Button size="sm" onClick={download} variant="gradient" className="hover-lift"><FileDown className="h-4 w-4 mr-2"/>Descargar .md</Button>
                </div>
              </div>
            )}

            {hasResult ? (
              viewMode === 'concept' ? (
                <ConceptMapViewer height={metaNodes && metaNodes.length > 12 ? '78vh' : '70vh'} code={resultMd} nodesMeta={metaNodes || undefined} initialZoom={persistZoom} onZoomChange={(z)=>{
                  setPersistZoom(z);
                  try { const key = `docai:mindmap:${documentId}`; const prev = localStorage.getItem(key); const obj = prev ? JSON.parse(prev) : {}; obj.zoom = z; localStorage.setItem(key, JSON.stringify(obj)); } catch {}
                }} onNodeClick={(info) => {
                  const p = info.startPage || info.endPage;
                  if (!p) return;
                  window.open(`/dashboard/documents/${documentId}/viewer?page=${p}`, '_blank');
                }} />
              ) : (
                <div className="border border-border rounded bg-card" style={{ height: '70vh' }}>
                  <MermaidRenderer code={resultMd} onNodeClick={(info) => {
                    const p = info.startPage || info.endPage;
                    if (!p) return;
                    window.open(`/dashboard/documents/${documentId}/viewer?page=${p}`, '_blank');
                  }} />
                </div>
              )
            ) : (
              <div className="h-[70vh] border border-dashed border-border rounded flex items-center justify-center text-sm text-secondary">Genera el mapa para visualizarlo aquí</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
