import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2 L30 16 L16 30 L2 16 Z" fill="#8B5CF6" strokeLinejoin="round" />
          </svg>
          <span className="text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.02em]">Cella</span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          <Link href="/docs" className="px-2.5 py-1 rounded-md text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors">Docs</Link>
        </nav>

        <Button asChild size="sm" variant="gradient" className="text-[12px] gap-1 px-3 py-1.5 h-8">
          <Link href="/zen">
            Abrir Cella
            <ArrowRight className="w-3 h-3" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
