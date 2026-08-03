"use client";

import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";

// Register the fcose layout plugin once
try {
  cytoscape.use(fcose);
} catch {
  // already registered
}

interface ConceptMapViewerProps {
  code: string; // mermaid mindmap markdown
  onNodeClick?: (info: { label: string; startPage?: number; endPage?: number }) => void;
  nodesMeta?: { label: string; clean_label?: string; pages?: { start?: number; end?: number }; snippet?: string }[] | null;
  height?: string; // CSS height, e.g., '65vh'
  initialZoom?: number; // optional persisted zoom
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
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

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
              return lvl === 0 ? "#bae6fd" : lvl === 1 ? "#dcfce7" : "#fef9c3";
            }) as any,
            "border-color": "#334155",
            "border-width": 2,
            label: "data(label)",
            color: "#111827",
            "font-weight": 700,
            "text-wrap": "wrap",
            "text-max-width": 160,
            padding: "10px",
            width: "label" as any,
            height: "label" as any,
            "text-valign": "center",
            "text-halign": "center",
            "shadow-blur": 12,
            "shadow-color": "#94a3b8",
            "shadow-opacity": 0.4,
          } as any,
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            "line-color": "#334155",
            width: 2,
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#334155",
            "arrow-scale": 1.2,
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
        nodeRepulsion: 4500,
        idealEdgeLength: 120,
        edgeElasticity: 0.45,
        gravity: 0.25,
        gravityRange: 3.8,
        gravityCompound: 1.0,
        gravityRangeCompound: 1.5,
        tile: true,
        tilingPaddingVertical: 20,
        tilingPaddingHorizontal: 20,
      } as any);
      layout.run();
    } catch (e) {
      const layout = cy.layout({
        name: "breadthfirst",
        directed: true,
        spacingFactor: 1.2,
        padding: 20,
        avoidOverlap: true,
        circle: false,
      } as any);
      layout.run();
    }

    cy.fit(undefined, 30);
    if (typeof initialZoom === "number" && initialZoom > 0) {
      cy.zoom(initialZoom);
      cy.center();
    }

    const parsePages = (label: string): { start?: number; end?: number } => {
      const s = label.toLowerCase();
      const m = s.match(/p[aá]g(?:\.|ina|inas)?\s*(\d+)(?:\s*[–\-]\s*(\d+))?/i);
      if (!m) return {};
      const a = parseInt(m[1], 10);
      const b = m[2] ? parseInt(m[2], 10) : undefined;
      if (!a) return {};
      return b ? { start: Math.min(a, b), end: Math.max(a, b) } : { start: a, end: a };
    };

    cy.on("mouseover", "node", (e: cytoscape.EventObject) => {
      const n = e.target as cytoscape.NodeSingular;
      const label: string = n.data("label") || "";
      const meta = n.data("_meta");
      const pages = meta && meta.pages ? meta.pages : parsePages(label);
      const rp = n.renderedPosition();
      let tip = label;
      if (meta && meta.snippet) tip += `\n${meta.snippet}`;
      if (pages && pages.start)
        tip += `\nPáginas: ${pages.start}${pages.end && pages.end !== pages.start ? "–" + pages.end : ""}`;
      setTooltip({ x: rp.x + 12, y: rp.y + 12, text: tip });
    });
    cy.on("mouseout", "node", () => setTooltip(null));
    cy.on("mousemove", "node", (e: cytoscape.EventObject) => {
      const n = e.target as cytoscape.NodeSingular;
      const rp = n.renderedPosition();
      setTooltip((prev) => (prev ? { ...prev, x: rp.x + 12, y: rp.y + 12 } : prev));
    });
    cy.on("tap", "node", (e: cytoscape.EventObject) => {
      const n = e.target as cytoscape.NodeSingular;
      const label: string = n.data("label") || "";
      const meta = n.data("_meta");
      const pages = meta && meta.pages ? meta.pages : parsePages(label);
      onNodeClick?.({ label, startPage: pages?.start, endPage: pages?.end });
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [code, nodesMeta, onNodeClick]);

  const fit = () => {
    if (!cyRef.current) return;
    cyRef.current.fit(undefined, 30);
    onZoomChange?.(cyRef.current.zoom());
  };
  const zoomIn = () => {
    if (!cyRef.current) return;
    const z = cyRef.current.zoom() * 1.1;
    cyRef.current.zoom(z);
    onZoomChange?.(z);
  };
  const zoomOut = () => {
    if (!cyRef.current) return;
    const z = cyRef.current.zoom() * 0.9;
    cyRef.current.zoom(z);
    onZoomChange?.(z);
  };
  const exportPng = () => {
    if (!cyRef.current) return;
    const dataUrl = cyRef.current.png({ bg: "white", full: true, scale: 2 });
    const a = document.createElement("a");
    a.href = dataUrl as string;
    a.download = "concept-map.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="border rounded bg-white relative" style={{ height }}>
      <div className="absolute right-2 top-2 z-10 flex gap-1 bg-white/95 border border-gray-300 rounded shadow-md p-1">
        <button
          onClick={zoomOut}
          className="px-2 py-1 text-[11px] border border-gray-300 rounded bg-white text-gray-800 hover:bg-gray-100"
        >
          -
        </button>
        <button
          onClick={fit}
          className="px-2 py-1 text-[11px] border border-gray-300 rounded bg-white text-gray-800 hover:bg-gray-100"
        >
          Ajustar
        </button>
        <button
          onClick={zoomIn}
          className="px-2 py-1 text-[11px] border border-gray-300 rounded bg-white text-gray-800 hover:bg-gray-100"
        >
          +
        </button>
        <button
          onClick={exportPng}
          className="px-2 py-1 text-[11px] border border-gray-300 rounded bg-white text-gray-800 hover:bg-gray-100"
        >
          PNG
        </button>
      </div>
      <div ref={hostRef} style={{ height: "100%" }} />
      {tooltip && (
        <div
          style={{ position: "absolute", left: tooltip.x, top: tooltip.y, zIndex: 50 }}
          className="pointer-events-none bg-black/80 text-white text-[11px] px-2 py-1 rounded shadow"
        >
          {tooltip.text.split("\n").map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}
