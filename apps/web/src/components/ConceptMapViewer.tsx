"use client";

import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";

try {
  cytoscape.use(fcose);
} catch {
  // already registered
}

interface ConceptMapViewerProps {
  code: string;
  onNodeClick?: (info: { label: string; startPage?: number; endPage?: number }) => void;
  nodesMeta?: { label: string; clean_label?: string; pages?: { start?: number; end?: number }; snippet?: string }[] | null;
  height?: string;
  initialZoom?: number;
  onZoomChange?: (zoom: number) => void;
}

type Node = { id: string; label: string; level: number };
type Edge = { source: string; target: string };
type CyInstance = cytoscape.Core;

function extractMermaid(code: string): string {
  const start = code.indexOf("```mermaid");
  if (start >= 0) {
    const end = code.indexOf("```", start + 3);
    if (end > start) return code.substring(start + "```mermaid".length, end).trim();
  }
  return code.trim().replace(/^```|```$/g, "");
}

function parseMindmap(code: string): { nodes: Node[]; edges: Edge[] } {
  const mm = extractMermaid(code);
  const lines = mm.split(/\r?\n/).map((l) => l.replace(/\t/g, "    "));
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i < lines.length && lines[i].trim().toLowerCase().startsWith("mindmap")) i++;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i >= lines.length) return { nodes: [], edges: [] };
  const rootLine = lines[i].trim();
  const rootLabel = rootLine.replace(/^root\)\s*/, "") || "Root";
  const rootId = "n0";
  const nodes: Node[] = [{ id: rootId, label: rootLabel, level: 0 }];
  const edges: Edge[] = [];
  const stack: { id: string; level: number }[] = [{ id: rootId, level: 0 }];
  let nextId = 1;
  for (let j = i + 1; j < lines.length; j++) {
    const raw = lines[j];
    if (!raw.trim()) continue;
    const m = raw.match(/^(\s*)(:+)\s+(.*)$/);
    if (!m) continue;
    const colonCount = m[2].length;
    const label = (m[3] || "").trim();
    const level = Math.max(1, Math.min(3, colonCount));
    while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop();
    const parent = stack[stack.length - 1] || { id: rootId, level: 0 };
    const id = `n${nextId++}`;
    nodes.push({ id, label, level });
    edges.push({ source: parent.id, target: id });
    stack.push({ id, level });
  }
  return { nodes, edges };
}

export default function ConceptMapViewer({
  code,
  onNodeClick,
  nodesMeta,
  height = "60vh",
  initialZoom,
  onZoomChange,
}: ConceptMapViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<CyInstance | null>(null);
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    snippet?: string;
    pages?: { start?: number; end?: number };
  } | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const { nodes, edges } = parseMindmap(code);
    const metaByClean = new Map<string, any>();
    if (nodesMeta && Array.isArray(nodesMeta)) {
      for (const m of nodesMeta) {
        const clean = (m.clean_label || m.label || "").trim().toLowerCase();
        if (clean) metaByClean.set(clean, m);
      }
    }

    const cy = cytoscape({
      container: hostRef.current,
      elements: [
        ...nodes.map((n) => {
          const clean = n.label
            .replace(/\s*\[?p[aá]g(?:\.|ina|inas)?[^\]]*\]?\s*$/i, "")
            .trim();
          const key = clean.toLowerCase();
          const meta = metaByClean.get(key);
          return {
            data: { id: n.id, label: clean, level: n.level, _meta: meta || null },
          };
        }),
        ...edges.map((e) => ({ data: { source: e.source, target: e.target } })),
      ],
      style: [
        {
          selector: "node",
          style: {
            shape: "round-rectangle",
            "background-color": ((ele: cytoscape.NodeSingular) => {
              const lvl = ele.data("level") || 0;
              if (lvl === 0) return "var(--primary-container)";
              if (lvl === 1) return "var(--secondary-container)";
              return "var(--tertiary-container)";
            }) as any,
            "border-color": ((ele: cytoscape.NodeSingular) => {
              const lvl = ele.data("level") || 0;
              if (lvl === 0) return "var(--primary)";
              if (lvl === 1) return "var(--secondary)";
              return "var(--tertiary)";
            }) as any,
            "border-width": 1.5,
            label: "data(label)",
            color: "var(--on-surface)",
            "font-size": 13,
            "font-weight": 600,
            "font-family": "var(--font-sans, Inter)",
            "text-wrap": "wrap",
            "text-max-width": 180,
            padding: 14,
            width: "label" as any,
            height: "label" as any,
            "text-valign": "center",
            "text-halign": "center",
            "shadow-blur": 8,
            "shadow-color": "#000",
            "shadow-opacity": 0.04,
            "transition-property": "border-width, shadow-opacity",
            "transition-duration": 150,
          } as any,
        },
        {
          selector: "node:active",
          style: {
            "border-width": 2.5,
            "shadow-opacity": 0.12,
            "shadow-blur": 16,
          },
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            "line-color": "var(--outline-variant)",
            width: 1.5,
            "target-arrow-shape": "triangle",
            "target-arrow-color": "var(--outline-variant)",
            "arrow-scale": 1,
          } as any,
        },
      ],
    } as any);

    try {
      const layout = cy.layout({
        name: "fcose",
        quality: "default",
        animate: false,
        randomize: true,
        packComponents: true,
        nodeRepulsion: 6000,
        idealEdgeLength: 140,
        edgeElasticity: 0.4,
        gravity: 0.3,
        gravityRange: 3.8,
        tile: true,
        tilingPaddingVertical: 24,
        tilingPaddingHorizontal: 24,
      } as any);
      layout.run();
    } catch {
      const layout = cy.layout({
        name: "breadthfirst",
        directed: true,
        spacingFactor: 1.3,
        padding: 24,
        avoidOverlap: true,
        circle: false,
      } as any);
      layout.run();
    }

    cy.fit(undefined, 40);

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [code, nodesMeta]);

  useEffect(() => {
    if (typeof initialZoom === "number" && initialZoom > 0 && cyRef.current) {
      cyRef.current.zoom(initialZoom);
      cyRef.current.center();
    }
  }, [initialZoom]);

  const fit = () => {
    if (!cyRef.current) return;
    cyRef.current.fit(undefined, 40);
    onZoomChange?.(cyRef.current.zoom());
  };
  const zoomIn = () => {
    if (!cyRef.current) return;
    const z = Math.min(cyRef.current.zoom() * 1.15, 3);
    cyRef.current.zoom(z);
    onZoomChange?.(z);
  };
  const zoomOut = () => {
    if (!cyRef.current) return;
    const z = Math.max(cyRef.current.zoom() * 0.85, 0.3);
    cyRef.current.zoom(z);
    onZoomChange?.(z);
  };
  const exportPng = () => {
    if (!cyRef.current) return;
    const dataUrl = cyRef.current.png({ bg: "white", full: true, scale: 2 });
    const a = document.createElement("a");
    a.href = dataUrl as string;
    a.download = "grafo-ideas.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="rounded-xl overflow-hidden bg-[var(--surface-container-low)] relative" style={{ height }}>
      <div className="absolute right-2 top-2 z-10 flex gap-1 bg-[var(--surface-container-lowest)]/95 backdrop-blur-sm rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-1">
        <button
          onClick={zoomOut}
          className="w-7 h-7 flex items-center justify-center rounded text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] transition-colors text-sm"
          title="Alejar"
        >
          −
        </button>
        <button
          onClick={fit}
          className="px-2 h-7 flex items-center justify-center rounded text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] transition-colors font-label-mono text-(length:--zen-fs-label)"
          title="Ajustar vista"
        >
          Ajustar
        </button>
        <button
          onClick={zoomIn}
          className="w-7 h-7 flex items-center justify-center rounded text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] transition-colors text-sm"
          title="Acercar"
        >
          +
        </button>
        <button
          onClick={exportPng}
          className="px-2 h-7 flex items-center justify-center rounded text-[var(--on-surface-variant)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors font-label-mono text-(length:--zen-fs-label)"
          title="Exportar PNG"
        >
          PNG
        </button>
      </div>
      <div ref={hostRef} style={{ height: "100%" }} />
      {tooltip && (
        <div
          style={{ position: "absolute", left: tooltip.x, top: tooltip.y, zIndex: 50 }}
          className="pointer-events-none bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.1)] px-3 py-2 max-w-[240px] border border-[var(--outline-variant)]/20"
        >
          <div className="font-semibold zen-text-body zen-read-text">{tooltip.label}</div>
          {tooltip.snippet && (
            <div className="text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] mt-0.5 leading-snug">
              {tooltip.snippet}
            </div>
          )}
          {tooltip.pages && tooltip.pages.start && (
            <div className="mt-1 inline-block px-1.5 py-px rounded bg-[var(--primary-fixed)]/10 text-[var(--primary-fixed)] font-label-mono text-(length:--zen-fs-label)">
              Páginas: {tooltip.pages.start}{tooltip.pages.end && tooltip.pages.end !== tooltip.pages.start ? "–" + tooltip.pages.end : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
