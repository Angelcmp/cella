"use client";

import { useCallback, useEffect, useState } from "react";

const MINIMIZED_KEY = "docai:sidebar:minimized";
const MOBILE_OPEN_KEY = "docai:sidebar:mobileOpen";

export function useSidebarState() {
  // Closed by default as requested
  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Load persisted state on mount
  useEffect(() => {
    try {
      const storedMin = localStorage.getItem(MINIMIZED_KEY);
      const storedMobile = localStorage.getItem(MOBILE_OPEN_KEY);
      if (storedMin !== null) setIsMinimized(storedMin === "true");
      if (storedMobile !== null) setIsMobileOpen(storedMobile === "true");
    } catch (_) {
      // ignore storage errors
    }
  }, []);

  const persistMin = useCallback((next: boolean) => {
    setIsMinimized(next);
    try { localStorage.setItem(MINIMIZED_KEY, String(next)); } catch (_) {}
  }, []);

  const toggleMinimize = useCallback(() => {
    persistMin(!isMinimized);
  }, [isMinimized, persistMin]);

  const setMobileOpen = useCallback((next: boolean) => {
    setIsMobileOpen(next);
    try { localStorage.setItem(MOBILE_OPEN_KEY, String(next)); } catch (_) {}
  }, []);

  return {
    isMinimized,
    toggleMinimize,
    setMinimized: persistMin,
    isMobileOpen,
    setMobileOpen,
  };
}

export default useSidebarState;

