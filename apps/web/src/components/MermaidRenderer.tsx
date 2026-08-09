"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import { toast } from "sonner";

interface MindmapRendererProps {
  code: string;
  onNodeClick?: (info: { label: string; startPage?: number; endPage?: number }) => void;
}

const transformer = new Transformer();

function extractNodeText(text: string): string {
  // Strip icon / class directives
  text = text.replace(/\s*::icon\([^)]*\)/g, "");
  text = text.replace(/\s*:::\S+/g, "");
  text = text.trim();
  if (!text) return "";

  // ((text)) circle
  let m = text.match(/^\(\((.*)\)\)$/);
  if (m) return m[1].trim();

  // {{text}} hexagon
  m = text.match(/^\{\{(.*)\}\}$/);
  if (m) return m[1].trim();

  // [text] rect
  m = text.match(/^\[(.*)\]$/);
  if (m) return m[1].trim();

  // (text) rounded
  m = text.match(/^\((.*)\)$/);
  if (m) return m[1].trim();

  // root(...) / root[...] / root{{...}} / root((...))
  m = text.match(/^root\s*[\(\[\{]?\(?\s*(.*?)\s*\)?[\)\]\}]?$/i);
  if (m) return m[1].trim();

  return text;
}

function mermaidToMarkdown(code: string): string {
  const fenced = code.match(/```mermaid\s*([\s\S]*?)\s*```/);
  const raw = fenced ? fenced[1] : code;
  const lines = raw.split("\n").map((l) => l.replace(/\r$/, ""));

  let mindmapIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase().startsWith("mindmap")) {
      mindmapIdx = i;
      break;
    }
  }

  let rootText = "Diagrama";
  const nodes: { depth: number; text: string }[] = [];
  let rootIndent = -1;
  let indentUnit = 2;

  for (let i = (mindmapIdx >= 0 ? mindmapIdx : -1) + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    if (line.trim().startsWith(":::")) continue;
    if (line.trim().startsWith("::icon")) continue;

    const indent = line.search(/\S/);
    if (indent === -1) continue;

    const text = extractNodeText(line.trim());
    if (!text) continue;

    if (rootIndent === -1) {
      // First meaningful node is the root
      rootText = text;
      rootIndent = indent;
      continue;
    }

    if (nodes.length === 0) {
      indentUnit = Math.max(1, indent - rootIndent);
    }

    const depth = Math.max(1, Math.round((indent - rootIndent) / indentUnit));
    nodes.push({ depth, text });
  }

  const out: string[] = [`# ${rootText}`];
  for (const node of nodes) {
    const level = Math.min(node.depth + 1, 6);
    out.push(`${"#".repeat(level)} ${node.text}`);
  }
  return out.join("\n");
}

function parsePages(label: string): { start?: number; end?: number } {
  const s = label.toLowerCase();
  const m = s.match(/p[aá]g(?:\.|ina|inas)?\s*(\d+)(?:\s*[–\-]\s*(\d+))?/i);
  if (!m) return {};
  const a = parseInt(m[1], 10);
  const b = m[2] ? parseInt(m[2], 10) : undefined;
  if (!a) return {};
  return b ? { start: Math.min(a, b), end: Math.max(a, b) } : { start: a, end: a };
}

function attachNodeListeners(svg: SVGSVGElement | null, onNodeClick?: MindmapRendererProps["onNodeClick"]) {
  if (!svg || !onNodeClick) return;
  const nodes = svg.querySelectorAll("g.markmap-node");
  nodes.forEach((node) => {
    const g = node as SVGGElement;
    g.style.cursor = "pointer";
    const textEl = g.querySelector("text");
    const label = textEl ? (textEl.textContent || "").trim() : "";
    if (!label) return;

    const handler = (e: Event) => {
      e.stopPropagation();
      const pages = parsePages(label);
      onNodeClick({ label, startPage: pages.start, endPage: pages.end });
    };
    g.addEventListener("click", handler);
    // Store handler for cleanup
    (g as any).__mindmapClick = handler;
  });
}

export default function MindmapRenderer({ code, onNodeClick }: MindmapRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<Markmap | null>(null);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const markdown = useMemo(() => mermaidToMarkdown(code), [code]);
  const { root } = useMemo(() => {
    try {
      return transformer.transform(markdown);
    } catch (e) {
      return { root: null };
    }
  }, [markdown]);

  const renderMap = useCallback(async () => {
    if (!svgRef.current) return;
    if (!root) {
      setError("No se pudo interpretar el diagrama");
      return;
    }
    setError(null);

    try {
      if (!mmRef.current) {
        const mm = Markmap.create(svgRef.current, { autoFit: true, fitRatio: 0.9, zoom: true, pan: true }, root);
        mmRef.current = mm;
      } else {
        await mmRef.current.setData(root);
        await mmRef.current.fit();
      }
      // Re-attach click listeners after render
      setTimeout(() => attachNodeListeners(svgRef.current, onNodeClick), 50);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al renderizar el mapa");
    }
  }, [root, onNodeClick]);

  useEffect(() => {
    renderMap();
  }, [renderMap]);

  useEffect(() => {
    return () => {
      mmRef.current?.destroy();
      mmRef.current = null;
    };
  }, []);

  const zoomIn = () => setScale((s) => Math.min(2, +(s + 0.1).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2)));
  const fit = async () => {
    setScale(1);
    await mmRef.current?.fit();
  };

  const sanitizeSvg = (svgEl: SVGSVGElement, sz: { w: number; h: number }): SVGSVGElement => {
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(sz.w));
    clone.setAttribute("height", String(sz.h));

    // Remove all style elements (font-face etc taint canvas)
    clone.querySelectorAll("style").forEach((el) => el.remove());

    // Remove any <image> elements with external href
    clone.querySelectorAll("image").forEach((el) => {
      const href = el.getAttribute("href") || el.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (href && !href.startsWith("#") && !href.startsWith("data:")) {
        el.remove();
      }
    });

    // Override font-family on all text elements to safe system font
    clone.querySelectorAll("text, tspan").forEach((el) => {
      const t = el as SVGTextElement;
      t.style.fontFamily = "sans-serif";
      t.setAttribute("font-family", "sans-serif");
    });

    return clone;
  };

  const svgToDataUri = (svgEl: SVGSVGElement): string => {
    const svg = new XMLSerializer().serializeToString(svgEl);
    return "data:image/svg+xml," + encodeURIComponent(svg);
  };

  const exportSvg = () => {
    const el = svgRef.current;
    if (!el) return;
    const vb = el.viewBox.baseVal;
    const w = vb?.width || el.clientWidth || 800;
    const h = vb?.height || el.clientHeight || 600;
    const clone = sanitizeSvg(el, { w: Math.ceil(w), h: Math.ceil(h) });
    const svg = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagrama.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPng = () => {
    const el = svgRef.current;
    if (!el) return;
    const vb = el.viewBox.baseVal;
    const w = Math.ceil(vb?.width || el.clientWidth || 800);
    const h = Math.ceil(vb?.height || el.clientHeight || 600);
    const clone = sanitizeSvg(el, { w, h });

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    const svg = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      try {
        canvas.toBlob((b) => {
          if (!b) return;
          const dl = URL.createObjectURL(b);
          const a = document.createElement("a");
          a.href = dl;
          a.download = "diagrama.png";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(dl);
        }, "image/png");
      } catch {
        downloadAsSvg(clone);
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      downloadAsSvg(clone);
    };
    img.src = url;
  };

  const downloadAsSvg = (clone: SVGSVGElement) => {
    const svg = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagrama.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("PNG no disponible — descargado como SVG", { description: "El renderizador usa fuentes externas" });
  };

  return (
    <div className="space-y-1 h-full flex flex-col">
      <div className="flex gap-1 justify-end px-1">
        <button onClick={zoomOut} className="w-6 h-6 flex items-center justify-center rounded text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] transition-colors text-sm">−</button>
        <button onClick={fit} className="px-2 h-6 flex items-center justify-center rounded text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] transition-colors font-label-mono text-(length:--zen-fs-label)">Ajustar</button>
        <button onClick={zoomIn} className="w-6 h-6 flex items-center justify-center rounded text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] transition-colors text-sm">+</button>
        <button onClick={exportSvg} className="px-2 h-6 flex items-center justify-center rounded text-[var(--on-surface-variant)] hover:text-[var(--primary-fixed)] hover:bg-[var(--surface-container-high)] transition-colors font-label-mono text-(length:--zen-fs-label)">SVG</button>
        <button onClick={exportPng} className="px-2 h-6 flex items-center justify-center rounded text-[var(--on-surface-variant)] hover:text-[var(--primary-fixed)] hover:bg-[var(--surface-container-high)] transition-colors font-label-mono text-(length:--zen-fs-label)">PNG</button>
      </div>
      {error && <div className="font-label-mono text-(length:--zen-fs-secondary) text-red-400 px-2">{error}</div>}
      <div className="flex-1 min-h-0 relative overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="absolute inset-0 overflow-auto" style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
          <svg ref={svgRef} className="w-full h-full" style={{ minHeight: "100%", minWidth: "100%" }} />
        </div>
      </div>
    </div>
  );
}
