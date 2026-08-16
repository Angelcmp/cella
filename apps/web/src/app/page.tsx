import Link from "next/link";
import { Button } from "@/components/ui/button";
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
        <div className="bg-[var(--bg-muted)] rounded-lg p-3 border border-[var(--border-subtle)] font-mono text-[12px] text-[var(--text-primary)] flex items-center justify-between">
          <span className="text-[var(--accent-highlight)]">./start.sh</span>
          <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)]">content_copy</span>
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
              className="px-2 py-1 bg-[var(--bg-muted)] rounded text-[10px] font-mono text-[var(--text-secondary)]"
            >
              {m}
            </span>
          ))}
          <span className="px-2 py-1 bg-transparent border border-[var(--border-subtle)] rounded text-[10px] font-mono text-[var(--text-muted)]">
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
        <div className="h-12 w-full bg-[var(--bg-muted)] rounded border border-[var(--border-subtle)] overflow-hidden relative flex items-center justify-center">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,220,229,0.05)_4px,rgba(0,220,229,0.05)_8px)]" />
          <span className="material-symbols-outlined text-[var(--accent-strong)] z-10 animate-bounce">upload_file</span>
        </div>
      ),
    },
  ];

  return (
    <div
      className="cyber flex flex-col min-h-screen text-[var(--text-primary)] relative"
      style={{ fontFamily: "var(--font-grotesk)" }}
    >
      {/* ── Fixed overlays: technical grid + scanlines ── */}
      <div className="technical-grid fixed inset-0 -z-10 pointer-events-none" aria-hidden />
      <div className="scanlines" aria-hidden />

      {/* ── Aurora Gradient Backgrounds ── */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--accent-strong)]/20 blur-[120px] rounded-full mix-blend-screen opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-[var(--accent-highlight)]/20 blur-[100px] rounded-full mix-blend-screen opacity-40" />
      </div>

      <LandingHeader />

      <main className="relative pt-12 flex-1">
        {/* ── Hero ── */}
        <section className="relative w-full px-4 md:px-16 py-6 md:py-8 flex flex-col items-center text-center max-w-[1280px] mx-auto z-10">
          <h1
            className="font-[var(--font-heading)] text-[22px] !leading-tight text-[var(--text-primary)] max-w-4xl mb-4 tracking-[-0.02em] font-semibold md:text-[clamp(1.375rem,5vw,3.5rem)]"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "22px",
            }}
          >
            Analiza tus PDFs con IA, <br />
            <span className="bg-linear-to-r from-[var(--accent-brand)] to-[var(--accent-primary)] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(102,247,255,0.3)]">
              sin subir nada a la nube
            </span>
            .
          </h1>

          <p className="text-[16px] leading-relaxed text-[var(--text-secondary)] max-w-2xl mb-6 text-lg">
            Cella es una alternativa local a NotebookLM. Sube documentos, chatea con su
            contenido y genera resúmenes, mapas mentales, quiz y guías de estudio con los
            modelos que tú elijas.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button asChild size="default" variant="gradient" className="px-8 py-3 rounded-xl text-base font-bold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(0,220,229,0.4)] transition-all group h-auto">
              <Link href="/zen">
                Abrir Cella
                <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </Button>
            <Button asChild size="default" variant="outline" className="px-8 py-3 rounded-xl bg-[var(--bg-muted)]/50 backdrop-blur-md border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] hover:text-[var(--accent-strong)] transition-all flex items-center gap-2 h-auto">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                <span className="material-symbols-outlined text-[20px]">code</span>
                Descargar el repo
              </a>
            </Button>
          </div>
        </section>

        {/* ── Demo Window Visual ── */}
        <section className="relative w-full px-4 md:px-16 pb-24 max-w-[1280px] mx-auto z-20 flex justify-center [perspective:1000px]">
          <HeroDemo />
        </section>

        <MarqueeTicker />

        {/* ── [ Cómo Empezar ] ── */}
        <section className="relative w-full px-4 md:px-16 py-32 max-w-[1280px] mx-auto z-10">
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-[1px] bg-[var(--accent-strong)]" />
              <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
                Initial Setup Sequence
              </span>
            </div>
            <h2 className="font-[var(--font-heading)] text-[clamp(2rem,4vw,3rem)] text-[var(--text-primary)]">
              Cómo Empezar
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-[28px] left-[10%] w-[80%] h-[1px] bg-linear-to-r from-transparent via-[var(--border-strong)] to-transparent -z-10" />

            {steps.map((s, i) => (
              <div
                key={s.title}
                className="group bg-[var(--bg-muted)]/30 backdrop-blur-[16px] rounded-2xl p-8 border border-[var(--border-subtle)] hover:bg-[var(--bg-muted)]/50 hover:border-[var(--accent-strong)]/30 transition-all duration-300 relative"
              >
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[24px] text-[var(--accent-strong)] shadow-lg group-hover:scale-110 transition-transform">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mt-4">
                  <h3 className="font-[var(--font-heading)] text-[24px] text-[var(--text-primary)] mb-4">
                    {s.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-6 min-h-[60px]">
                    {s.description}
                  </p>
                  {s.render()}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Button asChild size="default" variant="outline" className="px-8 py-3 rounded-xl bg-[var(--bg-muted)]/50 backdrop-blur-md border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] hover:text-[var(--accent-strong)] transition-all flex items-center gap-2 h-auto">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                Ver en GitHub
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </a>
            </Button>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full bg-[var(--bg-muted)] py-16 px-4 md:px-16 border-t border-[var(--border-subtle)]">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div>
              <span className="font-[var(--font-heading)] text-[20px] text-[var(--accent-strong)]">Cella</span>
              <div className="w-8 h-[1px] bg-[var(--accent-strong)] mt-1" />
            </div>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] max-w-xs">
              Análisis inteligente de documentos. Local, privado, open source.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest uppercase">Navigation</span>
            <Link href="/zen" className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
              App
            </Link>
            <Link href="/docs" className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
              Documentación
            </Link>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <span className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest uppercase">Version</span>
            <div className="font-mono text-[12px] text-[var(--text-secondary)]">
              v0.1.0 · local
            </div>
            <div className="text-[var(--text-secondary)] font-mono text-[10px] mt-4 uppercase">
              © 2026 Cella
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
