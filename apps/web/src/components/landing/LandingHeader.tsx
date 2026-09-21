import Link from "next/link";

export default function LandingHeader() {
  return (
    <header className="fixed top-0 w-full z-50 bg-[var(--zen-panel)] border-b border-[var(--zen-line)]">
      <div className="h-12 w-full max-w-[1100px] mx-auto px-4 md:px-8 flex items-center justify-between">
        {/* Left — logo + CELLA */}
        <Link
          href="/"
          aria-label="Cella — inicio"
          className="flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--primary-fixed)] transition-colors"
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
          <span className="text-[13px] font-semibold">Cella</span>
        </Link>

        {/* Center — nav */}
        <nav className="hidden md:flex items-center gap-7">
          <Link
            href="/docs"
            className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Docs
          </Link>
          <Link
            href="/zen"
            className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            App
          </Link>
        </nav>

        {/* Right — CTA */}
        <Link
          href="/zen"
          className="text-[13px] font-medium text-[var(--primary-fixed)] hover:opacity-80 transition-opacity"
        >
          Abrir Cella
        </Link>
      </div>
    </header>
  );
}
