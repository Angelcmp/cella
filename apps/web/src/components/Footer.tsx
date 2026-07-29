"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/zen")) {
    return null;
  }
  return (
    <footer className="bg-[var(--gradient-midnight)] text-white">
      <div className="container mx-auto px-4 py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-white/70">Cella</p>
          <p className="text-lg font-semibold">Inteligencia Orgánica para tus documentos.</p>
          <p className="text-xs text-white/60">
            © {new Date().getFullYear()} DocAI · Todos los derechos reservados.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-white/70">
          <a href="/docs" className="hover:text-white transition-colors">Documentación</a>
          <a href="/docs/demo" className="hover:text-white transition-colors">Política de Demo</a>
          <a href="/privacy" className="hover:text-white transition-colors">Privacidad</a>
          <a href="/terms" className="hover:text-white transition-colors">Términos</a>
        </div>
      </div>
    </footer>
  );
}
