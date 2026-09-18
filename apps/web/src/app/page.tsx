import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import LandingHeader from "@/components/landing/LandingHeader";
import HeroDemo from "@/components/landing/HeroDemo";
import MarqueeTicker from "@/components/landing/MarqueeTicker";

export const metadata = pageMetadata.home;

const REPO_URL = "https://github.com/Angelcmp/cella";

export default function LandingPage() {
  const steps = [
    {
      title: "Descarga e instala",
      description:
        "Clona el repositorio y levanta la app con un solo comando. Todo corre en tu máquina, garantizando privacidad absoluta.",
      render: () => (
        <div className="rounded-lg bg-[var(--zen-panel-alt)] px-3 py-2.5 border border-[var(--zen-line)] font-mono text-[12px] text-[var(--text-primary)] flex items-center justify-between">
          <span className="text-[var(--primary-fixed)]">./start.sh</span>
          <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)]">
            content_copy
          </span>
        </div>
      ),
    },
    {
      title: "Elige tu IA",
      description:
        "Usa modelos locales con Ollama para privacidad total, o conecta tu propia API key (OpenAI, Claude, Gemini, DeepSeek...).",
      render: () => (
        <div className="flex gap-2 flex-wrap">
          {["Ollama", "Llama 3", "Mistral"].map((m) => (
            <span
              key={m}
              className="px-2 py-1 rounded-md bg-[var(--zen-panel-alt)] text-[11px] text-[var(--text-secondary)]"
            >
              {m}
            </span>
          ))}
          <span className="px-2 py-1 rounded-md border border-[var(--zen-line)] text-[11px] text-[var(--text-muted)]">
            + APIs
          </span>
        </div>
      ),
    },
    {
      title: "Sube tus PDFs",
      description:
        "Chatea con citas verificables, genera resúmenes, mapas mentales, quiz y guías de estudio. Sin nube, sin registro.",
      render: () => (
        <div className="h-12 w-full rounded-lg bg-[var(--zen-panel-alt)] border border-[var(--zen-line)] flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px] text-[var(--text-secondary)]">
            upload_file
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="cyber flex flex-col min-h-screen text-[var(--text-primary)] relative">
      <LandingHeader />

      <main className="relative pt-12 flex-1">
        {/* ── Hero ── */}
        <section className="w-full px-4 md:px-8 pt-16 md:pt-24 pb-10 flex flex-col items-center text-center max-w-[1100px] mx-auto">
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] leading-[1.08] tracking-[-0.02em] font-semibold text-[var(--text-primary)] max-w-3xl mb-5">
            Analiza tus PDFs con IA, <br />
            <span className="text-[var(--primary-fixed)]">sin subir nada a la nube</span>.
          </h1>

          <p className="text-[16px] leading-relaxed text-[var(--text-secondary)] max-w-2xl mb-8">
            Cella es una alternativa local a NotebookLM. Sube documentos, chatea con su
            contenido y genera resúmenes, mapas mentales, quiz y guías de estudio con los
            modelos que tú elijas.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/zen"
              className="inline-flex items-center gap-2 rounded-[var(--radius-base)] bg-[var(--primary-fixed)] text-white px-6 py-3 text-[15px] font-medium hover:opacity-90 transition-opacity"
            >
              Abrir Cella
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[var(--radius-base)] border border-[var(--zen-line)] text-[var(--text-primary)] px-6 py-3 text-[15px] font-medium hover:bg-[var(--zen-hover)] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">code</span>
              Descargar el repo
            </a>
          </div>
        </section>

        {/* ── Demo Window Visual ── */}
        <section className="w-full px-4 md:px-8 pb-20 max-w-[1100px] mx-auto flex justify-center">
          <HeroDemo />
        </section>

        <MarqueeTicker />

        {/* ── [ Cómo Empezar ] ── */}
        <section className="w-full px-4 md:px-8 py-20 max-w-[1100px] mx-auto">
          <div className="mb-12">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Setup
            </span>
            <h2 className="mt-2 text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-[var(--text-primary)]">
              Cómo Empezar
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className="rounded-xl border border-[var(--zen-line)] bg-[var(--zen-panel)] p-7 hover:border-[var(--primary-fixed)]/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg border border-[var(--zen-line)] flex items-center justify-center text-[13px] font-medium text-[var(--text-secondary)] mb-5">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="text-[18px] font-semibold text-[var(--text-primary)] mb-2">
                  {s.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-5 min-h-[60px]">
                  {s.description}
                </p>
                {s.render()}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[var(--radius-base)] border border-[var(--zen-line)] text-[var(--text-primary)] px-6 py-3 text-[15px] font-medium hover:bg-[var(--zen-hover)] transition-colors"
            >
              Ver en GitHub
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </a>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full bg-[var(--zen-panel)] py-14 px-4 md:px-8 border-t border-[var(--zen-line)]">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-3.5 w-3.5 text-[var(--primary-fixed)]"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden
              >
                <path d="M16 2 L30 16 L16 30 L2 16 Z" fill="currentColor" />
              </svg>
              <span className="text-[16px] font-semibold text-[var(--text-primary)]">Cella</span>
            </div>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] max-w-xs">
              Análisis inteligente de documentos. Local, privado, open source.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.14em]">
              Navegación
            </span>
            <Link
              href="/zen"
              className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--primary-fixed)] transition-colors"
            >
              App
            </Link>
            <Link
              href="/docs"
              className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--primary-fixed)] transition-colors"
            >
              Documentación
            </Link>
          </div>
          <div className="flex flex-col gap-2.5 md:items-end">
            <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.14em]">
              Versión
            </span>
            <div className="text-[13px] text-[var(--text-secondary)]">v0.1.0 · local</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-2">© 2026 Cella</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
