"use client";

import { useState, useEffect } from "react";
import LeftSidebar from "./LeftSidebar";
import ChatPanel from "./ChatPanel";
import RightSidebar from "./RightSidebar";
import ProviderSettingsModal from "./ProviderSettingsModal";
import { PanelRightOpen, PanelRightClose, PanelLeft } from "lucide-react";
import Link from "next/link";
import { useZenStore } from "./store";

export default function ZenLayout() {
  const { documents, refreshModels } = useZenStore();
  const hasDocuments = documents.length > 0;
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);

  // Open the right sidebar automatically when a document is selected/available
  useEffect(() => {
    if (hasDocuments) {
      setRightOpen(true);
    }
  }, [hasDocuments]);

  // Load available models from the backend on mount
  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
      <header className="h-10 flex items-center justify-between px-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <div className="flex items-center gap-2">
          {hasDocuments && (
            <button
              onClick={() => setLeftOpen(!leftOpen)}
              className="p-1 rounded-md hover:bg-[var(--bg-muted)] text-[var(--text-muted)] transition-colors"
              title={leftOpen ? "Colapsar panel" : "Expandir panel"}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
          <Link href="/" className="flex items-center gap-1.5">
            <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2 L30 16 L16 30 L2 16 Z" fill="#9966CC" strokeLinejoin="round" />
            </svg>
            <span className="text-xs text-[var(--text-secondary)]">Cella</span>
          </Link>
        </div>
        {hasDocuments && (
          <button
            onClick={() => setRightOpen(!rightOpen)}
            className="p-1 rounded-md hover:bg-[var(--bg-muted)] text-[var(--text-muted)] transition-colors"
            title={rightOpen ? "Cerrar visor" : "Abrir visor"}
          >
            {rightOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        {hasDocuments && (
          <div
            className={`${
              leftOpen ? "w-[280px]" : "w-[52px]"
            } transition-all duration-200 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shrink-0`}
          >
            <LeftSidebar
              onClose={() => setLeftOpen(!leftOpen)}
              collapsed={!leftOpen}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <ChatPanel />
        </div>

        {hasDocuments && rightOpen && (
          <div className={`${
            rightOpen ? "w-[380px]" : "w-0"
          } transition-all duration-200 border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shrink-0`}>
            <RightSidebar />
          </div>
        )}
      </div>

      <ProviderSettingsModal />
    </div>
  );
}
