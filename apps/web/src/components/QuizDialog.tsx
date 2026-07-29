"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { withCsrfHeaders } from "@/lib/csrf";
import { toast } from "sonner";
import { Loader2, FileDown, Clipboard, ListChecks } from "lucide-react";

interface QuizDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  defaultPages?: { start: number; end: number };
}

export default function QuizDialog({ open, onClose, documentId, documentTitle, defaultPages }: QuizDialogProps) {
  const [startPage, setStartPage] = useState<string>("");
  const [endPage, setEndPage] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [numQuestions, setNumQuestions] = useState<string>("10");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultMd, setResultMd] = useState<string>("");
  const [pagesUsed, setPagesUsed] = useState<{start:number; end:number} | null>(null);

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
      const body: any = { num_questions: parseInt(numQuestions || '10', 10) };
      const s = parseInt(startPage, 10);
      const e = parseInt(endPage, 10);
      if (!isNaN(s) && !isNaN(e)) body.pages = { start: s, end: e };
      if (query && query.trim()) body.query = query.trim();
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}/quiz`, withCsrfHeaders({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      }));
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({} as any));
        throw new Error(err?.detail || 'No se pudo generar el cuestionario');
      }
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Fallo en generación');
      if (data.pages_used) setPagesUsed(data.pages_used);
      setResultMd(data.markdown || '');
      toast.success('Cuestionario generado');
    } catch (e:any) {
      toast.error(e?.message || 'Error generando el cuestionario');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try { await navigator.clipboard.writeText(resultMd); toast.success('Copiado'); }
    catch { toast.error('No se pudo copiar'); }
  };

  const download = () => {
    const content = resultMd || '# Cuestionario\n';
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = (documentTitle || 'cuestionario').replace(/[^a-zA-Z0-9-_]+/g, '_');
    a.download = `${base}_quiz.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const hasResult = !!resultMd;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl glass-panel rounded-[16px] border border-[var(--border-subtle)] shadow-soft text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <span>Generar Cuestionario</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            Documento: <span className="font-medium">{documentTitle}</span>
            {pagesUsed && (
              <span className="ml-2 text-secondary">• Rango usado: pág. {pagesUsed.start}–{pagesUsed.end}</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start">Página inicio</Label>
              <input id="start" type="number" min={1} value={startPage} onChange={(e) => setStartPage(e.target.value)} className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Página fin</Label>
              <input id="end" type="number" min={1} value={endPage} onChange={(e) => setEndPage(e.target.value)} className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nq">Preguntas</Label>
              <input id="nq" type="number" min={1} max={20} value={numQuestions} onChange={(e) => setNumQuestions(e.target.value)} className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="focus">Enfoque (opcional)</Label>
            <textarea id="focus" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej: énfasis en definiciones y fechas" className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { reset(); onClose(); }} className="border-border text-foreground hover:bg-muted">Cerrar</Button>
            <Button onClick={generate} disabled={isGenerating} variant="gradient" className="hover-lift">
              {isGenerating ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>) : (<>Generar</>)}
            </Button>
          </div>

          {hasResult && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-secondary">Resultado (Cuestionario en Markdown)</p>
                <div className="flex gap-2 items-center">
                  <Button size="sm" variant="outline" onClick={copyToClipboard} className="border-border text-foreground hover:bg-muted"><Clipboard className="h-4 w-4 mr-2"/>Copiar</Button>
                  <Button size="sm" onClick={download} variant="gradient" className="hover-lift"><FileDown className="h-4 w-4 mr-2"/>Descargar .md</Button>
                </div>
              </div>
              <pre className="bg-muted/50 p-3 rounded-lg whitespace-pre-wrap text-sm max-h-96 overflow-auto">{resultMd}</pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
