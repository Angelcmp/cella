"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-4 h-4 border-2 border-[var(--primary-fixed)] border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

function extractMermaid(code: string): string {
  const start = code.indexOf("```mermaid");
  if (start >= 0) {
    const end = code.indexOf("```", start + 3);
    if (end > start) return code.substring(start + "```mermaid".length, end).trim();
  }
  return code.trim().replace(/^```|```$/g, "");
}

interface ObsidianGraphProps {
  code: string;
  nodesMeta?: { label: string; clean_label?: string; pages?: { start?: number; end?: number }; snippet?: string }[] | null;
  onNodeClick?: (info: { label: string; startPage?: number; endPage?: number }) => void;
}

const levelColors = [
  "var(--primary-fixed)",
  "var(--secondary-fixed)",
  "var(--tertiary-fixed)",
  "var(--primary-container)",
];

const levelSizes = [6, 5, 4, 3];

function computeNeighbors(node: any, linkData: any[]) {
  const nodeIds = new Set<string>();
  const linkIdxs = new Set<number>();
  if (!node) return { nodeIds, linkIdxs };

  const walk = (id: string, depth: number) => {
    if (depth > 2 || nodeIds.has(id)) return;
    nodeIds.add(id);
    nodeIds.add(id);
    linkData.forEach((l: any, idx: number) => {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      if (s === id || t === id) {
        linkIdxs.add(idx);
        walk(s === id ? t : s, depth + 1);
      }
    });
  };
  walk(node.id, 0);
  return { nodeIds, linkIdxs };
}

export default function ObsidianGraph({ code, nodesMeta, onNodeClick }: ObsidianGraphProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 400, height: 300 });
  const [hoverNode, setHoverNode] = useState<any>(null);
  const [highlightNodeIds, setHighlightNodeIds] = useState<Set<string>>(new Set());
  const [highlightLinkIdxs, setHighlightLinkIdxs] = useState<Set<number>>(new Set());
  const graphLinksRef = useRef<any[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDims({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const mm = extractMermaid(code);
    const lines = mm.split(/\r?\n/).map((l) => l.replace(/\t/g, "    "));
    let i = 0;
    while (i < lines.length && !lines[i].trim()) i++;
    if (i < lines.length && lines[i].trim().toLowerCase().startsWith("mindmap")) i++;
    while (i < lines.length && !lines[i].trim()) i++;
    if (i >= lines.length) return { nodes: [], links: [] };

    const rootLine = lines[i].trim();
    const rootLabel = rootLine.replace(/^root\)\s*/, "") || "Root";

    const metaByClean = new Map<string, any>();
    if (nodesMeta && Array.isArray(nodesMeta)) {
      for (const m of nodesMeta) {
        const clean = (m.clean_label || m.label || "").trim().toLowerCase();
        if (clean) metaByClean.set(clean, m);
      }
    }

    const clean = (label: string) =>
      label.replace(/\s*\[?p[aá]g(?:\.|ina|inas)?[^\]]*\]?\s*$/i, "").trim();

    const nodes: any[] = [
      { id: "n0", label: clean(rootLabel), level: 0, _meta: metaByClean.get(clean(rootLabel).toLowerCase()) || null },
    ];
    const links: any[] = [];
    const stack: { id: string; level: number }[] = [{ id: "n0", level: 0 }];
    let nextId = 1;

    for (let j = i + 1; j < lines.length; j++) {
      const raw = lines[j];
      const trimmed = raw.trim();
      if (!trimmed) continue;

      const indentMatch = raw.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[0].length : 0;
      const label = trimmed.replace(/^:+\s*/, "").trim();
      if (!label) continue;

      const lvl = Math.max(1, Math.min(3, Math.floor(indent / 4)));
      while (stack.length > 0 && stack[stack.length - 1].level >= lvl) stack.pop();
      const parent = stack[stack.length - 1] || { id: "n0", level: 0 };
      const id = `n${nextId++}`;
      const cleanLabel = clean(label);
      nodes.push({ id, label: cleanLabel, level: lvl, _meta: metaByClean.get(cleanLabel.toLowerCase()) || null });
      links.push({ source: parent.id, target: id });
      stack.push({ id, level: lvl });
    }

    return { nodes, links };
  }, [code, nodesMeta]);

  useEffect(() => {
    graphLinksRef.current = graphData.links;
  }, [graphData.links]);

  const handleNodeHover = useCallback(
    (node: any | null) => {
      setHoverNode(node);
      if (node) {
        const { nodeIds, linkIdxs } = computeNeighbors(node, graphLinksRef.current);
        setHighlightNodeIds(nodeIds);
        setHighlightLinkIdxs(linkIdxs);
      } else {
        setHighlightNodeIds(new Set());
        setHighlightLinkIdxs(new Set());
      }
    },
    []
  );

  const handleNodeClick = useCallback(
    (node: any) => {
      if (!onNodeClick) return;
      const meta = node._meta;
      const parsePages = (label: string) => {
        const s = label.toLowerCase();
        const m = s.match(/p[aá]g(?:\.|ina|inas)?\s*(\d+)(?:\s*[–\-]\s*(\d+))?/i);
        if (!m) return {};
        const a = parseInt(m[1], 10);
        const b = m[2] ? parseInt(m[2], 10) : undefined;
        if (!a) return {};
        return b ? { start: Math.min(a, b), end: Math.max(a, b) } : { start: a, end: a };
      };
      const pages = meta && meta.pages ? meta.pages : parsePages(node.label);
      onNodeClick({ label: node.label, startPage: pages?.start, endPage: pages?.end });
    },
    [onNodeClick]
  );

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const lvl = node.level ?? 0;
      const baseSize = levelSizes[lvl] ?? 3;
      const isHovered = hoverNode && hoverNode.id === node.id;
      const isHighlighted = highlightNodeIds.has(node.id);
      const isDimmed = hoverNode && !isHighlighted && !isHovered;

      const size = (isHovered ? baseSize + 2 : baseSize) / globalScale;
      const color = levelColors[lvl] ?? levelColors[3];
      ctx.globalAlpha = isDimmed ? 0.1 : 1;

      ctx.beginPath();
      ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.fill();

      if (isHovered) {
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2.5 / globalScale;
        ctx.stroke();

        const label: string = node.label || "";
        const fontSize = 10 / globalScale;
        ctx.font = `600 ${fontSize}px var(--font-sans, Inter)`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "var(--on-surface)";
        ctx.fillText(label, node.x!, node.y! - size - 4 / globalScale);

        const meta = node._meta;
        if (meta?.pages?.start) {
          const pageText = `p.${meta.pages.start}${meta.pages.end && meta.pages.end !== meta.pages.start ? "-" + meta.pages.end : ""}`;
          const sFontSize = 9 / globalScale;
          ctx.font = `${sFontSize}px var(--font-sans, Inter)`;
          ctx.fillStyle = "var(--primary-fixed)";
          ctx.fillText(pageText, node.x!, node.y! - size - 4 / globalScale - fontSize - 1 / globalScale);
        }
        if (meta?.snippet) {
          const snippet = meta.snippet.length > 50 ? meta.snippet.slice(0, 50) + "…" : meta.snippet;
          const sFontSize = 9 / globalScale;
          const offset = meta?.pages?.start ? fontSize + 2 / globalScale : 1 / globalScale;
          ctx.font = `${sFontSize}px var(--font-sans, Inter)`;
          ctx.fillStyle = "var(--on-surface-variant)";
          ctx.globalAlpha = 0.6;
          ctx.fillText(snippet, node.x!, node.y! - size - 4 / globalScale - fontSize - 4 / globalScale - offset);
        }
      }

      ctx.globalAlpha = 1;
    },
    [hoverNode, highlightNodeIds]
  );

  return (
    <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden bg-[var(--surface-container-low)] relative">
      <div className="absolute right-2 top-2 z-10 flex gap-1 bg-[var(--surface-container-lowest)]/95 backdrop-blur-sm rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-1">
        <button
          onClick={() => fgRef.current?.zoomToFit(400, 60)}
          className="px-2 h-7 flex items-center justify-center rounded text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] transition-colors font-label-mono text-(length:--zen-fs-label)"
          title="Ajustar vista"
        >
          Ajustar
        </button>
      </div>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={dims.width}
        height={dims.height}
        backgroundColor="transparent"
        nodeRelSize={1}
        nodeLabel={(node: any) => {
          const meta = node._meta;
          let tip = node.label || "";
          if (meta?.snippet) tip += `\n${meta.snippet}`;
          if (meta?.pages?.start) {
            tip += `\nPáginas: ${meta.pages.start}${meta.pages.end && meta.pages.end !== meta.pages.start ? "–" + meta.pages.end : ""}`;
          }
          return tip;
        }}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          const size = (levelSizes[node.level ?? 0] ?? 3) + 5;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        linkColor={(link: any) => {
          if (!hoverNode) return "var(--outline-variant)";
          const idx = graphLinksRef.current.indexOf(link);
          return highlightLinkIdxs.has(idx) ? "var(--primary-fixed)" : "rgba(191,200,202,0.08)";
        }}
        linkWidth={(link: any) => {
          if (!hoverNode) return 0.5;
          const idx = graphLinksRef.current.indexOf(link);
          return highlightLinkIdxs.has(idx) ? 2 : 0.3;
        }}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.35}
        cooldownTicks={120}
        onEngineStop={() => fgRef.current?.zoomToFit(400, 60)}
        enableNodeDrag={false}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        minZoom={0.3}
        maxZoom={3}
      />
    </div>
  );
}
