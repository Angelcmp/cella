"use client";

import { useEffect, useState } from "react";
import LeftSidebar from "./LeftSidebar";
import ChatPanel from "./ChatPanel";
import RightSidebar from "./RightSidebar";
import ProviderSettingsModal from "./ProviderSettingsModal";
import { Settings } from "lucide-react";
import { useZenStore, hydrateZenStore } from "./store";

export default function ZenLayout() {
  const { refreshModels, setModelsModalOpen } = useZenStore();
  const [rightCollapsed, setRightCollapsed] = useState(false);

  useEffect(() => {
    hydrateZenStore();
    refreshModels();
  }, [refreshModels]);

  return (
    <div className="cyber h-screen flex flex-col bg-[var(--background)] relative overflow-hidden">
      {/* ── Cyber gradient background ── */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 technical-grid" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[var(--primary-fixed)]/5 blur-[120px] rounded-full opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_4px] opacity-40 mix-blend-overlay" />
      </div>

      {/* Left aside: Sources */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-[var(--surface-container)]/60 backdrop-blur-2xl z-50 flex flex-col border-r border-[var(--outline-variant)]/20">
        <LeftSidebar />
      </aside>

      {/* Right aside: Studio */}
      <aside
        className={`fixed right-0 top-0 h-full bg-[var(--surface-container-lowest)]/80 backdrop-blur-xl z-50 flex flex-col border-l border-[var(--outline-variant)]/20 transition-[width] duration-300 ${
          rightCollapsed ? "w-[72px]" : "w-[620px]"
        }`}
      >
        <RightSidebar
          collapsed={rightCollapsed}
          onToggleCollapse={() => setRightCollapsed(!rightCollapsed)}
        />
      </aside>

      {/* Center */}
      <div
        className={`relative z-10 flex flex-col h-full bg-[var(--zen-read-bg)] transition-[padding] duration-300 ${
          rightCollapsed ? "pl-72 pr-[72px]" : "pl-72 pr-[620px]"
        }`}
      >
        <header
          className={`fixed top-0 left-72 h-16 bg-[var(--surface-container)]/60 backdrop-blur-2xl z-40 flex items-center justify-between px-8 border-b border-[var(--outline-variant)]/20 transition-[right] duration-300 ${
            rightCollapsed ? "right-[72px]" : "right-[620px]"
          }`}
        >
          <div className="flex items-center gap-6">
            <button
              className="font-label-mono bg-[var(--primary-fixed)] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-(length:--zen-fs-body) hover:opacity-90 transition-opacity"
              title="Nueva conversación"
            >
              <span className="text-[14px] leading-none font-medium">+</span>
              Nueva Conversación
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setModelsModalOpen(true)}
              className="p-2 text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors"
              title="Ajustes de modelos"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="relative pt-16 min-h-0 flex-1 flex flex-col">
          <ChatPanel />
        </main>
      </div>

      <ProviderSettingsModal />
    </div>
  );
}
