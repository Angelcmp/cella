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
    <div className="cyber h-screen flex flex-col bg-[var(--zen-canvas)] relative overflow-hidden">
      {/* Left aside: Sources */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-[var(--zen-panel)] z-50 flex flex-col border-r border-[var(--zen-line)]">
        <LeftSidebar />
      </aside>

      {/* Right aside: Studio */}
      <aside
        className={`fixed right-0 top-0 h-full bg-[var(--zen-panel)] z-50 flex flex-col border-l border-[var(--zen-line)] transition-[width] duration-300 ${
          rightCollapsed ? "w-14" : "w-[440px]"
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
          rightCollapsed ? "pl-72 pr-14" : "pl-72 pr-[440px]"
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
