import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] relative bg-[var(--bg-surface)]/85 dark:bg-transparent backdrop-blur-xl">
      <div className="absolute inset-0 hidden dark:block bg-[var(--gradient-midnight)] opacity-90 pointer-events-none" />
      <div className="relative container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3">
          <svg className="w-10 h-10" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2 L30 16 L16 30 L2 16 Z" fill="#9966CC" strokeLinejoin="round" />
          </svg>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Cella</p>
            <p className="font-semibold text-[var(--text-primary)]">Biblioteca IA</p>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-3 text-sm">
          <a href="#features" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Características
          </a>
          <Link href="/pricing" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Precios
          </Link>
          <Link href="/docs" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Documentación
          </Link>
          <Link href="/docs/demo" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Demo Policy
          </Link>
          <Button asChild variant="gradient" className="hover-lift">
            <Link href="/zen">Acceder a Cella</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
