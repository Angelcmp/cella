"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BookOpen,
  Brain,
  ChevronDown,
  FileText,
  GitFork,
  HelpCircle,
  ListChecks,
  Lock,
  MessageSquarePlus,
  Mic,
  Paperclip,
  Pin,
  Plus,
  Share2,
  Sparkles,
  StickyNote,
  Terminal,
} from "./icons";

type AnswerToken =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "citation"; value: string }
  | { kind: "break" };

const DEMO_QUERY = "¿Cuáles son los puntos clave del reporte Q4?";

const DEMO_ANSWER_TOKENS: AnswerToken[] = [
  { kind: "text", value: "Basado en el documento, los puntos clave son:" },
  { kind: "break" },
  { kind: "text", value: "1. Los ingresos crecieron un " },
  { kind: "bold", value: "23%" },
  { kind: "text", value: " respecto al trimestre anterior" },
  { kind: "citation", value: "(Página 12)" },
  { kind: "break" },
  { kind: "text", value: "2. El margen operativo alcanzó el " },
  { kind: "bold", value: "18.5%" },
  { kind: "text", value: ", máximo histórico" },
  { kind: "citation", value: "(Página 15)" },
];

const DEMO_CITATIONS = [
  {
    page: 12,
    snippet: "Ingresos Q4: $4.2B (+23% YoY), impulsados por expansión en LATAM.",
    similarity: 0.91,
  },
  {
    page: 15,
    snippet: "Margen operativo: 18.5%, +340bps vs Q3, eficiencia en costos logísticos.",
    similarity: 0.87,
  },
];

const DEMO_SOURCES = [
  { title: "reporte_financiero_q4_2025.pdf", status: "indexed" as const, pages: 24 },
  { title: "estrategia_2026.pdf", status: "processing" as const, pages: 18 },
];

const DEMO_CONVERSATIONS = [
  { title: "Puntos clave Q4", time: "10:42", active: true },
  { title: "Resumen ejecutivo 2025", time: "09:15" },
  { title: "Mapa mental: finanzas", time: "Ayer" },
  { title: "Quiz: margen operativo", time: "Ayer" },
];

const STUDIO_TOOLS = [
  { label: "Visor PDF", Icon: FileText },
  { label: "Resumen", Icon: Sparkles },
  { label: "Mapa Mental", Icon: Share2 },
  { label: "Quiz", Icon: ListChecks },
  { label: "Guía", Icon: BookOpen },
  { label: "FAQ", Icon: HelpCircle },
  { label: "Notas", Icon: StickyNote },
  { label: "Diagrama", Icon: GitFork },
];

function StatusDot({ status }: { status: "indexed" | "processing" }) {
  const color =
    status === "indexed"
      ? "var(--zen-dot-indexed, #16a34a)"
      : "var(--zen-dot-processing, #f59e0b)";
  return (
    <span className="relative inline-flex h-1.5 w-1.5 flex-shrink-0">
      {status === "processing" && (
        <span
          className="absolute inset-0 animate-ping rounded-full opacity-60"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

export default function HeroDemo() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [step, setStep] = useState(0);
  const [typedQuery, setTypedQuery] = useState("");
  const [streamedAnswer, setStreamedAnswer] = useState<AnswerToken[]>([]);
  const [thinkingMs, setThinkingMs] = useState(0);
  const [showCitations, setShowCitations] = useState(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mql.matches);
    const onChange = () => setReduceMotion(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      // Static final state — no animation, no loop.
      setTypedQuery(DEMO_QUERY);
      setStreamedAnswer(DEMO_ANSWER_TOKENS);
      setThinkingMs(1840);
      setShowCitations(true);
      setStep(5);
      return;
    }

    const clearAll = () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };

    const schedule = (fn: () => void, delay: number) => {
      const id = window.setTimeout(fn, delay);
      timersRef.current.push(id);
    };

    const reset = () => {
      clearAll();
      setTypedQuery("");
      setStreamedAnswer([]);
      setThinkingMs(0);
      setShowCitations(false);
      setStep(0);
    };

    let cancelled = false;

    const runCycle = () => {
      if (cancelled) return;

      const queryLen = DEMO_QUERY.length;
      let charIdx = 0;

      const typeQuery = () => {
        if (cancelled) return;
        charIdx += 1;
        setTypedQuery(DEMO_QUERY.slice(0, charIdx));
        if (charIdx < queryLen) {
          schedule(typeQuery, 45);
        } else {
          setStep(2);
          schedule(() => {
            if (cancelled) return;
            setStep(3);
            const thinkStart = performance.now();
            const thinkTick = () => {
              if (cancelled) return;
              const elapsed = performance.now() - thinkStart;
              setThinkingMs(Math.min(1840, Math.round(elapsed)));
              if (elapsed < 1800) {
                const id = window.setTimeout(thinkTick, 60);
                timersRef.current.push(id);
              } else {
                setStep(4);
                let tokIdx = 0;
                const streamTick = () => {
                  if (cancelled) return;
                  tokIdx += 1;
                  setStreamedAnswer(DEMO_ANSWER_TOKENS.slice(0, tokIdx));
                  if (tokIdx < DEMO_ANSWER_TOKENS.length) {
                    schedule(streamTick, 110);
                  } else {
                    setStep(5);
                    schedule(() => setShowCitations(true), 250);
                    schedule(() => {
                      if (cancelled) return;
                      reset();
                      runCycle();
                    }, 3200);
                  }
                };
                schedule(streamTick, 110);
              }
            };
            const id = window.setTimeout(thinkTick, 60);
            timersRef.current.push(id);
          }, 400);
        }
      };
      schedule(typeQuery, 900);
    };

    reset();
    runCycle();

    return () => {
      cancelled = true;
      clearAll();
    };
  }, [reduceMotion]);

  return (
    <div className="w-full max-w-6xl animate-window-pop">
      <div className="overflow-hidden rounded-2xl border border-[var(--zen-line)] bg-[var(--zen-panel)] shadow-[var(--zen-elev-1)]">
        {/* Window chrome */}
        <div className="flex h-12 items-center justify-between border-b border-[var(--zen-line)] bg-[var(--zen-panel-alt)] px-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--outline-variant)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--outline-variant)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--outline-variant)]" />
          </div>
          <div className="flex items-center gap-2 rounded-md border border-[var(--zen-line)] bg-[var(--zen-panel)] px-3 py-1 font-mono text-[12px] text-[var(--text-secondary)]">
            <Lock className="h-3 w-3" />
            <span>localhost:3000 / cella</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1 w-4 rounded bg-[var(--zen-line)]" />
            <span className="h-1 w-4 rounded bg-[var(--zen-line)]" />
            <span className="h-1 w-4 rounded bg-[var(--zen-line)]" />
          </div>
        </div>

        {/* 3-column body */}
        <div className="flex h-[600px]">
          {/* Left aside — Fuentes + Conversaciones */}
          <aside className="hidden w-52 flex-shrink-0 flex-col border-r border-[var(--zen-line)] bg-[var(--zen-panel-alt)] p-4 md:flex lg:w-60">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--on-surface-variant)]">
                Fuentes
              </span>
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--zen-hover)]"
                aria-label="Añadir fuente"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mb-4 space-y-2">
              {DEMO_SOURCES.map((src) => (
                <div
                  key={src.title}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--zen-hover)]"
                >
                  <StatusDot status={src.status} />
                  <span className="flex-1 truncate font-label-mono text-[length:var(--zen-fs-label)] text-[var(--text-primary)]">
                    {src.title}
                  </span>
                  <span className="font-label-mono text-[length:var(--zen-fs-label)] text-[var(--text-muted)]">
                    {src.pages}p
                  </span>
                </div>
              ))}
            </div>

            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--on-surface-variant)]">
                Conversaciones
              </span>
              <button
                type="button"
                className="flex h-5 items-center gap-1 rounded-md bg-[var(--primary-fixed)]/90 px-2 font-label-mono text-[length:var(--zen-fs-label)] text-white hover:bg-[var(--primary-fixed)]"
                aria-label="Nueva conversación"
              >
                <MessageSquarePlus className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-1">
              {DEMO_CONVERSATIONS.map((conv) => (
                <div
                  key={conv.title}
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
                    conv.active
                      ? "border border-[var(--primary-fixed)]/30 bg-[var(--primary-fixed)]/8"
                      : "hover:bg-[var(--zen-hover)]"
                  }`}
                >
                  <span className="flex-1 truncate font-label-mono text-[length:var(--zen-fs-label)] text-[var(--text-primary)]">
                    {conv.title}
                  </span>
                  <div className="flex items-center gap-2">
                    {conv.active && <Pin className="h-3 w-3 text-[var(--primary-fixed)]" />}
                    <span className="font-label-mono text-[length:var(--zen-fs-label)] text-[var(--text-muted)]">
                      {conv.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Center — chat */}
          <section className="flex flex-1 flex-col bg-[var(--zen-panel)]">
            <header className="flex items-center justify-between border-b border-[var(--zen-line)] px-5 py-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--primary-fixed)]" />
                <span className="font-label-mono text-[length:var(--zen-fs-secondary)] text-[var(--on-surface)]">
                  reporte_financiero_q4_2025.pdf
                </span>
                <span className="rounded bg-[var(--zen-panel-alt)] px-1.5 py-0.5 font-label-mono text-[length:var(--zen-fs-tertiary)] text-[var(--on-surface-variant)]">
                  24 pág
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot status="indexed" />
                <span className="font-label-mono text-[length:var(--zen-fs-tertiary)] text-[var(--on-surface-variant)]">
                  indexado
                </span>
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-hidden px-5 py-5">
              <div className="flex justify-end">
                <div className="max-w-[80%] animate-fade-in-up rounded-xl rounded-tr-sm bg-[var(--zen-hover)] px-4 py-3 text-[length:var(--zen-fs-read)] leading-relaxed text-[var(--zen-read-text,#111827)]">
                  {typedQuery || "\u00A0"}
                  {step <= 1 && (
                    <span className="ml-0.5 inline-block h-3 w-px animate-cursor bg-[var(--primary-fixed)] align-middle" />
                  )}
                </div>
              </div>

              {step >= 3 && step < 5 && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] animate-fade-in-up rounded-xl border border-[var(--zen-line)] bg-[var(--zen-panel-alt)] px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                      <span className="font-label-mono text-[length:var(--zen-fs-secondary)] text-[var(--text-secondary)]">
                        {step === 3 ? "Pensando…" : "Pensó durante"}
                      </span>
                      <span className="font-label-mono text-[length:var(--zen-fs-secondary)] tabular-nums text-[var(--text-primary)]">
                        {thinkingMs}ms
                      </span>
                      <ChevronDown className="h-3 w-3 rotate-180 text-[var(--text-muted)]" />
                    </div>
                    {step === 3 && (
                      <div className="mt-2 flex items-center gap-1 px-1 font-mono text-[12px] text-[var(--text-secondary)]">
                        <span>analizando páginas relevantes</span>
                        <span className="ml-1 inline-block h-3 w-1.5 animate-cursor bg-[var(--accent-primary)]/70" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step >= 4 && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] animate-fade-in-up text-[length:var(--zen-fs-read)] leading-relaxed text-[var(--zen-read-text,#111827)]">
                    {streamedAnswer.map((tok, i) => {
                      if (tok.kind === "break") return <br key={i} />;
                      if (tok.kind === "bold")
                        return (
                          <strong key={i} className="font-semibold text-[var(--text-primary)]">
                            {tok.value}
                          </strong>
                        );
                      if (tok.kind === "citation")
                        return (
                          <span
                            key={i}
                            className="mx-0.5 inline-block rounded bg-[var(--primary-fixed)]/8 px-1.5 py-px font-label-mono text-[length:var(--zen-fs-label)] font-medium text-[var(--primary-fixed)]"
                          >
                            {tok.value}
                          </span>
                        );
                      return <span key={i}>{tok.value}</span>;
                    })}
                    {step === 4 && streamedAnswer.length < DEMO_ANSWER_TOKENS.length && (
                      <span className="ml-0.5 inline-block h-3 w-px animate-cursor bg-[var(--primary-fixed)] align-middle" />
                    )}
                  </div>
                </div>
              )}

              {step >= 5 && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] animate-fade-in-up rounded-lg border border-[var(--zen-line)] bg-[var(--zen-panel-alt)] px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setShowCitations((v) => !v)}
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--primary-fixed)]" />
                      <span className="font-label-mono text-[length:var(--zen-fs-secondary)] font-medium text-[var(--text-primary)]">
                        Citas ({DEMO_CITATIONS.length})
                      </span>
                      <ChevronDown
                        className={`h-3 w-3 text-[var(--text-muted)] transition-transform duration-300 ${
                          showCitations ? "" : "-rotate-90"
                        }`}
                      />
                    </button>
                    {showCitations && (
                      <div className="mt-2 space-y-1.5">
                        {DEMO_CITATIONS.map((cit) => (
                          <div
                            key={cit.page}
                            className="flex items-start gap-2 border-l-2 border-[var(--zen-line)] pl-2"
                          >
                            <button
                              type="button"
                              className="rounded bg-[var(--primary-fixed)]/10 px-1.5 py-0.5 font-label-mono text-[length:var(--zen-fs-label)] font-medium text-[var(--primary-fixed)] hover:bg-[var(--primary-fixed)]/20"
                            >
                              P.{cit.page}
                            </button>
                            <span className="text-[12px] leading-snug text-[var(--text-secondary)]">
                              {cit.snippet}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 px-4 pb-3 pt-2">
              <div className="mx-auto flex max-w-[640px] items-center gap-2 rounded-xl bg-[var(--zen-panel)] border border-[var(--zen-line)] p-1.5">
                <div className="flex items-center gap-1.5 rounded-md border border-[var(--zen-line)] px-2 py-1">
                  <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-[var(--primary-fixed)]" />
                  <span className="font-label-mono text-[length:var(--zen-fs-label)] text-[var(--on-surface-variant)]">
                    Model::Llama 3
                  </span>
                  <ChevronDown className="h-3 w-3 text-[var(--on-surface-variant)]" />
                </div>
                <div className="flex flex-1 items-center">
                  <span className="font-label-mono text-[length:var(--zen-fs-body)] text-[var(--on-surface-variant)]/50">
                    Haz una pregunta sobre el documento...
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Adjuntar"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)]"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Micrófono"
                    className="hidden h-7 w-7 items-center justify-center rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)] sm:flex"
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Terminal"
                    className="hidden h-7 w-7 items-center justify-center rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)] sm:flex"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Enviar"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary-fixed)] text-white transition-opacity hover:opacity-90"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Right aside — Studio */}
          <aside className="hidden w-64 flex-shrink-0 flex-col border-l border-[var(--zen-line)] bg-[var(--zen-panel-alt)] p-4 lg:flex">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--on-surface-variant)]">
                Studio
              </span>
              <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STUDIO_TOOLS.map(({ label, Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="flex flex-col items-start gap-2 rounded-xl border border-[var(--zen-line)] bg-[var(--zen-panel)] p-2.5 text-left transition-colors hover:bg-[var(--zen-hover)]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--zen-panel-alt)] text-[var(--on-surface-variant)]">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[length:var(--zen-fs-secondary)] text-[var(--on-surface)]">
                    {label}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-auto rounded-lg border border-[var(--zen-line)] bg-[var(--zen-panel)] p-3">
              <div className="flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-[var(--primary-fixed)]" />
                <span className="font-label-mono text-[length:var(--zen-fs-secondary)] font-medium text-[var(--on-surface)]">
                  Análisis
                </span>
              </div>
              <p className="mt-1.5 text-[12px] leading-snug text-[var(--text-secondary)]">
                Generación de resúmenes, mapas mentales, quizzes y guías de estudio en segundo plano.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}