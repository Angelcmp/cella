import Link from "next/link";

export default function LandingHeader() {
  return (
    <header className="fixed top-0 w-full z-50 bg-[rgba(11,21,21,0.1)] backdrop-blur-xl border-b border-[rgba(132,148,148,0.2)]">
      <div className="h-20 w-full max-w-[1280px] mx-auto px-4 md:px-16 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link
            href="/"
            className="font-[var(--font-heading)] text-[24px] tracking-widest uppercase text-[var(--accent-primary)] leading-none"
          >
            Cella
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/docs"
              className="font-mono text-[12px] tracking-[0.05em] text-[var(--text-secondary)] hover:text-[var(--accent-strong)] transition-colors"
            >
              DOCS
            </Link>
            <Link
              href="/zen"
              className="font-mono text-[12px] tracking-[0.05em] text-[var(--text-secondary)] hover:text-[var(--accent-strong)] transition-colors"
            >
              APP
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
