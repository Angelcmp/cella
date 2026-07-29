"use client";

import { useState, useEffect } from "react";
import LeftSidebar from "./LeftSidebar";
import ChatPanel from "./ChatPanel";
import RightSidebar from "./RightSidebar";
import { PanelRightOpen, PanelRightClose } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ZenLayout() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initSession = async () => {
      try {
        const meRes = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
        });
        if (!meRes.ok) {
          await fetch(`${API_URL}/auth/guest`, {
            method: "POST",
            credentials: "include",
          });
        }
      } catch {}
      setReady(true);
    };
    initSession();
  }, []);

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center space-y-3">
          <svg className="w-10 h-10" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2 L30 16 L16 30 L2 16 Z" fill="#9966CC" strokeLinejoin="round" />
          </svg>
          <p className="text-xs text-[var(--text-secondary)]">
            Preparando tu sesión...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
      <header className="h-10 flex items-center justify-between px-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLeftOpen(!leftOpen)}
            className="p-1 rounded-md hover:bg-[var(--bg-muted)] text-[var(--text-muted)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-1.5">
            <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2 L30 16 L16 30 L2 16 Z" fill="#9966CC" strokeLinejoin="round" />
            </svg>
            <span className="text-xs text-[var(--text-secondary)]">Cella</span>
          </Link>
        </div>
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
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div
          className={`${
            leftOpen ? "w-[240px]" : "w-0"
          } transition-all duration-200 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shrink-0`}
        >
          {leftOpen && <LeftSidebar onClose={() => setLeftOpen(false)} />}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <ChatPanel />
        </div>

        {rightOpen && (
          <div className={`${
            rightOpen ? "w-[380px]" : "w-0"
          } transition-all duration-200 border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shrink-0`}>
            <RightSidebar />
          </div>
        )}
      </div>
    </div>
  );
}
