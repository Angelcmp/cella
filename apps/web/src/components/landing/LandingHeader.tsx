import Link from "next/link";

export default function LandingHeader() {
  return (
    <header className="fixed top-0 w-full z-50 bg-transparent backdrop-blur-xl border-b border-[rgba(132,148,148,0.2)]">
      <div className="h-12 w-full max-w-[1280px] mx-auto px-4 md:px-16 grid grid-cols-3 items-center">
        {/* Left — logo + CELLA */}
        <Link
          href="/"
          aria-label="Cella — inicio"
          className="group flex items-center gap-2 justify-self-start text-[var(--accent-primary)] transition-all duration-300 hover:scale-[1.04] hover:text-[var(--accent-strong)] hover:opacity-80"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path d="M16 2 L30 16 L16 30 L2 16 Z" fill="currentColor" />
          </svg>
          <span className="font-label-mono text-[12px] uppercase tracking-[0.2em] leading-none">
            Cella
          </span>
        </Link>

        {/* Center — nav */}
        <nav className="hidden md:flex items-center justify-center gap-6 justify-self-center">
          <Link
            href="/docs"
            className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--text-secondary)] hover:text-[var(--accent-strong)] transition-colors"
          >
            Docs
          </Link>
          <span className="h-1 w-1 rounded-full bg-[var(--text-muted)]/40" aria-hidden />
          <Link
            href="/zen"
            className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--text-secondary)] hover:text-[var(--accent-strong)] transition-colors"
          >
            App
          </Link>
        </nav>

        {/* Right — reserved */}
        <div className="justify-self-end" aria-hidden />
      </div>
    </header>
  );
}