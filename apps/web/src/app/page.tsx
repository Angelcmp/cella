import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/lib/metadata";
import { ArrowRight } from "lucide-react";
import LandingHeader from "@/components/landing/LandingHeader";
import HeroDemo from "@/components/landing/HeroDemo";
import {
  ChatCitationsPanel,
  SummaryPanel,
  MindmapPanel,
  QuizPanel,
  ThinkingPanel,
  ModelPanel,
  UploadPanel,
  IndexingPanel,
  ChatExplorePanel,
} from "@/components/landing/FeaturePanels";

export const metadata = pageMetadata.home;

function FeatureRow({
  title,
  description,
  panel,
  reverse = false,
}: {
  title: string;
  description: string;
  panel: React.ReactNode;
  reverse?: boolean;
}) {
  const panelEl = (
    <div className="max-w-xs mx-auto w-full">{panel}</div>
  );
  const textEl = (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-[-0.01em]">{title}</h3>
      <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed max-w-xs">{description}</p>
    </div>
  );

  return (
    <div className="grid md:grid-cols-2 gap-6 items-center py-6">
      {reverse ? (
        <>
          {panelEl}
          {textEl}
        </>
      ) : (
        <>
          {textEl}
          {panelEl}
        </>
      )}
    </div>
  );
}

export default function LandingPage() {
  const features = [
    { title: "Chat con citas", description: "Respuestas con fragmentos exactos y número de página.", panel: <ChatCitationsPanel /> },
    { title: "Resúmenes automáticos", description: "Síntesis ejecutivas con puntos clave generados por IA.", panel: <SummaryPanel /> },
    { title: "Mapas mentales", description: "Visualiza tus documentos como grafos interactivos.", panel: <MindmapPanel /> },
    { title: "Quiz inteligentes", description: "Preguntas de opción múltiple desde el contenido.", panel: <QuizPanel /> },
    { title: "Razonamiento visible", description: "Mira cómo piensa el modelo paso a paso.", panel: <ThinkingPanel /> },
    { title: "Multi-modelo", description: "DeepSeek V4 Flash, GLM-4.5, GLM-4.7 y más.", panel: <ModelPanel /> },
  ];

  const steps = [
    { title: "Sube tu documento", description: "PDF, DOCX, PPTX o TXT. Hasta 30 MB.", panel: <UploadPanel /> },
    { title: "Indexación semántica", description: "Extracción de texto y embeddings con FastEmbed.", panel: <IndexingPanel /> },
    { title: "Conversa y explora", description: "Chat, resúmenes, mapas mentales y quiz.", panel: <ChatExplorePanel /> },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-primary)]" style={{ fontFamily: "var(--font-landing)" }}>
      <LandingHeader />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="py-14 md:py-18">
          <div className="max-w-6xl mx-auto px-4 space-y-8">
            <div className="max-w-lg mx-auto text-center space-y-4">
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
                Tu biblioteca digital,{" "}
                <span className="text-[var(--accent-brand)]">con IA</span>
              </h1>
              <p className="text-[13px] text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                Sube documentos, chatea con su contenido y genera resúmenes, mapas mentales y quiz con IA privada y open source.
              </p>
              <div className="flex flex-wrap justify-center gap-2.5">
                <Button asChild size="sm" variant="gradient" className="text-[12px] gap-1 px-3.5 py-1.5 h-8">
                  <Link href="/zen">
                    Abrir Cella
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="text-[12px] px-3.5 py-1.5 h-8">
                  <Link href="/docs">Documentación</Link>
                </Button>
              </div>
            </div>

            <HeroDemo />
          </div>
        </section>

        {/* ── [ Features ] ── */}
        <section id="features" className="py-14 border-t border-[var(--border-subtle)]">
          <div className="max-w-5xl mx-auto px-4">
            <span className="inline-block font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--text-muted)] mb-8">
              [ Features ]
            </span>

            <div className="divide-y divide-[var(--border-subtle)]">
              {features.map((f, i) => (
                <FeatureRow
                  key={f.title}
                  title={f.title}
                  description={f.description}
                  panel={f.panel}
                  reverse={i % 2 === 1}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── [ How it Works ] ── */}
        <section className="py-14 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)]/30">
          <div className="max-w-5xl mx-auto px-4">
            <span className="inline-block font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--text-muted)] mb-8">
              [ How it Works ]
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((s, i) => (
                <div key={s.title} className="text-center space-y-4">
                  <div className="max-w-[200px] mx-auto">
                    {s.panel}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="font-mono text-[10px] text-[var(--text-muted)] tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{s.title}</h3>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-snug max-w-48 mx-auto">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-16 border-t border-[var(--border-subtle)]">
          <div className="max-w-6xl mx-auto px-4 text-center space-y-4">
            <h2 className="text-lg md:text-xl font-semibold text-[var(--text-primary)] tracking-[-0.02em]">
              Prueba Cella con tu primer documento
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)] max-w-xs mx-auto">
              Sin registro. Sube un archivo y empieza a conversar en segundos.
            </p>
            <Button asChild size="sm" variant="gradient" className="text-[12px] gap-1 px-4 py-1.5 h-8">
              <Link href="/zen">
                Abrir Cella
                <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-muted)]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="col-span-2 md:col-span-1 space-y-2">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 2 L30 16 L16 30 L2 16 Z" fill="#8B5CF6" strokeLinejoin="round" />
                </svg>
                <span className="font-semibold text-[var(--accent-brand)] text-[13px]">Cella</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed max-w-48">
                Análisis inteligente de documentos con IA. Open source, privado y local.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium">Producto</p>
              <div className="space-y-1">
                <Link href="/zen" className="block text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Zen Workspace</Link>
                <Link href="/docs" className="block text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Documentación</Link>
                <Link href="/pricing" className="block text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Precios</Link>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium">Proyecto</p>
              <div className="space-y-1">
                <Link href="/docs#architecture" className="block text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Arquitectura</Link>
                <Link href="/docs#api-reference" className="block text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">API</Link>
                <Link href="/docs#faq" className="block text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">FAQ</Link>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-[var(--text-secondary)]">&copy; {new Date().getFullYear()} Cella</p>
            <span className="text-[11px] text-[var(--text-secondary)]">Open source</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
