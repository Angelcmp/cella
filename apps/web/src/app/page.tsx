import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/lib/metadata";
import { ArrowRight, Download, Github } from "lucide-react";
import LandingHeader from "@/components/landing/LandingHeader";
import HeroDemo from "@/components/landing/HeroDemo";

export const metadata = pageMetadata.home;

const REPO_URL = "https://github.com/Angelcmp/cella";

export default function LandingPage() {
  const steps = [
    {
      title: "Descarga e instala",
      description: "Clona el repositorio y levanta la app con un solo comando (./start.sh). Todo corre en tu máquina.",
    },
    {
      title: "Elige tu IA",
      description: "Usa modelos locales con Ollama, o conecta tu propia API key (OpenAI, Claude, Gemini, DeepSeek...).",
    },
    {
      title: "Sube tus PDFs",
      description: "Chatea con citas, genera resúmenes, mapas mentales, quiz y guías de estudio. Sin nube, sin registro.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-primary)]" style={{ fontFamily: "var(--font-landing)" }}>
      <LandingHeader />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="py-14 md:py-18">
          <div className="max-w-6xl mx-auto px-4 space-y-10">
            <div className="max-w-xl mx-auto text-center space-y-5">
              <span className="inline-block font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-full px-3 py-1">
                100% local · open source · estilo NotebookLM
              </span>
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
                Analiza tus PDFs con IA,{" "}
                <span className="text-[var(--accent-brand)]">sin subir nada a la nube</span>
              </h1>
              <p className="text-[13px] text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                Cella es una alternativa local a NotebookLM. Sube documentos, chatea con
                su contenido y genera resúmenes, mapas mentales, quiz y guías de estudio
                con los modelos que tú elijas.
              </p>
              <div className="flex flex-wrap justify-center gap-2.5">
                <Button asChild size="sm" variant="gradient" className="text-[12px] gap-1 px-3.5 py-1.5 h-8">
                  <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                    <Download className="w-3 h-3" />
                    Descargar el repo
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="text-[12px] gap-1 px-3.5 py-1.5 h-8">
                  <Link href="/zen">
                    Abrir Cella
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </div>

            <HeroDemo />
          </div>
        </section>

        {/* ── [ Uso ] ── */}
        <section className="py-14 border-t border-[var(--border-subtle)]">
          <div className="max-w-5xl mx-auto px-4">
            <span className="inline-block font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--text-muted)] mb-8">
              [ Cómo empezar ]
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((s, i) => (
                <div key={s.title} className="space-y-2">
                  <span className="font-mono text-[10px] text-[var(--text-muted)] tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{s.title}</h3>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-snug">{s.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Button asChild size="sm" variant="outline" className="text-[12px] gap-1 px-3.5 py-1.5 h-8">
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="w-3 h-3" />
                  Ver en GitHub
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-muted)]">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2 L30 16 L16 30 L2 16 Z" fill="#8B5CF6" strokeLinejoin="round" />
              </svg>
              <span className="font-semibold text-[var(--accent-brand)] text-[13px]">Cella</span>
              <span className="text-[11px] text-[var(--text-muted)]">
                Análisis inteligente de documentos. Local, privado, open source.
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/zen" className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Abrir la app
              </Link>
              <Link href="/docs" className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Documentación
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
