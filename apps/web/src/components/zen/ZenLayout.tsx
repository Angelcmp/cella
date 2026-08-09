"use client";

import { useEffect, useState } from "react";
import LeftSidebar from "./LeftSidebar";
import ChatPanel from "./ChatPanel";
import RightSidebar from "./RightSidebar";
import ProviderSettingsModal from "./ProviderSettingsModal";
import { useZenStore, hydrateZenStore } from "./store";

export default function ZenLayout() {
  const { refreshModels } = useZenStore();
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
        className={`fixed right-0 top-0 h-full bg-[var(--surface-container-lowest)]/80 backdrop-blur-xl z-50 flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.02)] transition-[width] duration-300 ${
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
        <main className="relative pt-0 min-h-0 flex-1 flex flex-col">
          <ChatPanel />
        </main>
      </div>

      <ProviderSettingsModal />
    </div>
  );
}
