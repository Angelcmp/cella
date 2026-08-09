"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidRendererProps {
  code: string; // full markdown or mermaid code block
  onNodeClick?: (info: { label: string; startPage?: number; endPage?: number }) => void;
}

// Extract mermaid code from markdown
function extractMermaid(code: string): string {
  const start = code.indexOf("```mermaid");
  if (start >= 0) {
    const end = code.indexOf("```", start + 3);
    if (end > start) {
      return code.substring(start + "```mermaid".length, end).trim();
    }
  }
  // if no fence, assume the entire content is mermaid code
  return code.trim().replace(/^```|```$/g, "");
}

declare global {
  interface Window { mermaid?: any }
}

export default function MermaidRenderer({ code, onNodeClick }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    // Load mermaid from CDN if not present
    if (window.mermaid) { setLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    script.async = true;
    script.onload = () => { setLoaded(true); };
    script.onerror = () => { setLoaded(false); };
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, []);

  useEffect(() => {
    if (!loaded || !containerRef.current || !window.mermaid) return;
    try {
      setError(null);
      // Conceptual map theme: dark text on white, pastel nodes, rounded corners, thicker lines
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        themeVariables: {
          background: '#ffffff',
          primaryTextColor: '#111827',
          textColor: '#111827',
          lineColor: '#334155',
          fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial',
          fontSize: '14px',
          primaryColor: '#E0F2FE',   // light blue
          secondaryColor: '#DCFCE7', // light green
          tertiaryColor: '#FEF9C3',  // light yellow
        },
        themeCSS: `
          .mermaid, .mermaid svg { background: #ffffff !important; }
          .mermaid text, .mermaid tspan { fill: #111827 !important; }
          .mermaid .edgePaths path { stroke: #334155 !important; stroke-width: 1.5px; }
          .mermaid g.node rect, .mermaid g.node polygon, .mermaid g.node circle { stroke: #334155 !important; stroke-width: 1.5px; }
          .mermaid g.node rect { rx: 10px; ry: 10px; }
        `,
      });
      const codeOnly = extractMermaid(code);
      // Build a <pre class="mermaid"> node with textContent (no HTML) and let mermaid run
      const host = containerRef.current;
      host.innerHTML = "";
      const pre = document.createElement('pre');
      pre.className = 'mermaid';
      // Ensure starts with 'mindmap' line
      pre.textContent = codeOnly.startsWith('mindmap') ? codeOnly : `mindmap\n${codeOnly}`;
      host.appendChild(pre);
      // Run mermaid on the container
      if (typeof window.mermaid.run === 'function') {
        window.mermaid.run({ querySelector: host });
      } else if (typeof window.mermaid.init === 'function') {
        window.mermaid.init(undefined, host);
      }

      // Bind interactions: tooltips and click
      const parsePages = (label: string): { start?: number; end?: number } => {
        const s = label.toLowerCase();
        const m = s.match(/p[aá]g(?:\.|ina|inas)?\s*(\d+)(?:\s*[–\-]\s*(\d+))?/i);
        if (!m) return {};
        const a = parseInt(m[1], 10);
        const b = m[2] ? parseInt(m[2], 10) : undefined;
        if (!a) return {};
        return b ? { start: Math.min(a,b), end: Math.max(a,b) } : { start: a, end: a };
      };
      const nodes = host.querySelectorAll('g.node');
      nodes.forEach((node: any) => {
        const textEl = node.querySelector('text');
        const label = textEl ? (textEl.textContent || '').trim() : '';
        node.style.cursor = 'pointer';
        node.addEventListener('mouseenter', (ev: MouseEvent) => {
          const pages = parsePages(label);
          const tip = label + (pages.start ? `\nPáginas: ${pages.start}${pages.end && pages.end !== pages.start ? '–'+pages.end : ''}` : '');
          setTooltip({ x: ev.clientX + 10, y: ev.clientY + 10, text: tip });
        });
        node.addEventListener('mousemove', (ev: MouseEvent) => {
          setTooltip(prev => prev ? { ...prev, x: ev.clientX + 10, y: ev.clientY + 10 } : prev);
        });
        node.addEventListener('mouseleave', () => setTooltip(null));
        node.addEventListener('click', () => {
          const pages = parsePages(label);
          onNodeClick?.({ label, startPage: pages.start, endPage: pages.end });
        });
      });
    } catch (e: any) {
      setError(e?.message || 'No se pudo renderizar el diagrama');
      if (containerRef.current) {
        containerRef.current.innerHTML = `<pre>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;
      }
    }
  }, [loaded, code]);

  const exportSvg = () => {
    const el = containerRef.current?.querySelector('svg');
    if (!el) return;
    const svg = new XMLSerializer().serializeToString(el);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mindmap.svg';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPng = async () => {
    const el = containerRef.current?.querySelector('svg') as SVGSVGElement | null;
    if (!el) return;
    const svg = new XMLSerializer().serializeToString(el);
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const vb = el.viewBox.baseVal;
      const width = vb && vb.width ? vb.width : el.clientWidth || 1200;
      const height = vb && vb.height ? vb.height : el.clientHeight || 800;
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width);
      canvas.height = Math.ceil(height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0,0,canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => {
        if (!b) return;
        const dl = URL.createObjectURL(b);
        const a = document.createElement('a'); a.href = dl; a.download = 'mindmap.png';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(dl);
      }, 'image/png');
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const zoomIn = () => setScale(s => Math.min(2, +(s + 0.1).toFixed(2)));
  const zoomOut = () => setScale(s => Math.max(0.5, +(s - 0.1).toFixed(2)));
  const fit = () => setScale(1);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 justify-end">
        <button onClick={zoomOut} className="px-2 py-1 font-label-mono text-(length:--zen-fs-label) border rounded">-</button>
        <button onClick={fit} className="px-2 py-1 font-label-mono text-(length:--zen-fs-label) border rounded">Ajustar</button>
        <button onClick={zoomIn} className="px-2 py-1 font-label-mono text-(length:--zen-fs-label) border rounded">+</button>
        <button onClick={exportSvg} className="px-2 py-1 font-label-mono text-(length:--zen-fs-label) border rounded">Exportar SVG</button>
        <button onClick={exportPng} className="px-2 py-1 font-label-mono text-(length:--zen-fs-label) border rounded">Exportar PNG</button>
      </div>
      {!loaded && (<div className="font-label-mono text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)]">Cargando motor de visualización…</div>)}
      {error && (<div className="font-label-mono text-(length:--zen-fs-secondary) text-red-400">{error}</div>)}
      <div className="relative overflow-auto border rounded bg-white text-[#111827]" style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        <div ref={containerRef} className="p-2" />
        {tooltip && (
          <div style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, zIndex: 50 }} className="pointer-events-none bg-black/80 text-white text-(length:--zen-fs-label) px-2 py-1 rounded shadow">
            {tooltip.text.split('\n').map((l, i) => (<div key={i}>{l}</div>))}
          </div>
        )}
      </div>
    </div>
  );
}
