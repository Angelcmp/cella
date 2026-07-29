"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("docai-theme");
    const prefersDark = savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
    applyTheme(prefersDark);
  }, []);

  const applyTheme = (nextIsDark: boolean) => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.toggle("dark", nextIsDark);
    body.classList.toggle("dark", nextIsDark);
    root.dataset.theme = nextIsDark ? "dark" : "light";
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem("docai-theme", newIsDark ? "dark" : "light");
    applyTheme(newIsDark);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="text-secondary hover:text-accent transition-colors"
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
