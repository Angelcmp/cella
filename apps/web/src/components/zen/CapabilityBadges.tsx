"use client";

import { Brain, Eye, Wrench, Zap } from "lucide-react";

import type { ProviderCatalogEntry } from "./store";

interface Props {
  capabilities: ProviderCatalogEntry["capabilities"];
  size?: "sm" | "md";
}

export default function CapabilityBadges({ capabilities, size = "sm" }: Props) {
  const items: { key: keyof ProviderCatalogEntry["capabilities"]; Icon: typeof Brain; label: string; color: string; bg: string }[] = [
    {
      key: "has_embeddings",
      Icon: Brain,
      label: "Embeddings",
      color: "text-violet-700",
      bg: "bg-violet-100",
    },
    {
      key: "supports_streaming",
      Icon: Zap,
      label: "Streaming",
      color: "text-sky-700",
      bg: "bg-sky-100",
    },
    {
      key: "supports_vision",
      Icon: Eye,
      label: "Visión",
      color: "text-emerald-700",
      bg: "bg-emerald-100",
    },
    {
      key: "supports_tools",
      Icon: Wrench,
      label: "Tools",
      color: "text-amber-700",
      bg: "bg-amber-100",
    },
  ];

  const dim = size === "sm" ? "h-5 px-1.5 gap-1 text-[9px]" : "h-6 px-2 gap-1.5 text-[10px]";
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <div className="flex flex-wrap items-center gap-1">
      {items
        .filter((it) => capabilities[it.key])
        .map(({ key, Icon, label, color, bg }) => (
          <span
            key={key}
            className={`inline-flex items-center rounded font-label-mono uppercase tracking-wider ${dim} ${bg} ${color}`}
            title={label}
          >
            <Icon className={iconSize} />
            {size === "md" && label}
          </span>
        ))}
    </div>
  );
}