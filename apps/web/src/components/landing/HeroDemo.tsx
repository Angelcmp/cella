const HISTORY = [
  { icon: "forum", title: "Puntos clave del reporte Q4", time: "10:42" },
  { icon: "description", title: "Resumen ejecutivo 2025", time: "09:15" },
  { icon: "account_tree", title: "Mapa mental: finanzas", time: "Ayer" },
  { icon: "quiz", title: "Quiz: margen operativo", time: "Ayer" },
];

const FUNCTIONS = [
  { icon: "account_tree", label: "Mapa Mental" },
  { icon: "quiz", label: "Generar Quiz" },
  { icon: "summarize", label: "Resumen" },
  { icon: "note_stack", label: "Notas" },
  { icon: "format_list_bulleted", label: "Guía" },
];

export default function HeroDemo() {
  return (
    <div className="w-full max-w-6xl bg-[var(--bg-muted)]/60 backdrop-blur-[16px] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
      {/* Window Header */}
      <div className="h-12 bg-[rgba(23,33,33,0.8)] flex items-center justify-between px-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#ffb4ab]/80" />
          <span className="w-3 h-3 rounded-full bg-[var(--accent-primary)]/80" />
          <span className="w-3 h-3 rounded-full bg-[var(--accent-strong)]/80" />
        </div>
        <div className="font-mono text-[12px] text-[var(--text-secondary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          localhost:3000 / cella_workspace
        </div>
        <div className="flex gap-1">
          <span className="w-1 h-4 bg-[var(--border-strong)]" />
          <span className="w-1 h-4 bg-[var(--border-strong)]" />
          <span className="w-1 h-4 bg-[var(--border-strong)]" />
        </div>
      </div>

      {/* Window Body: 3-column workspace */}
      <div className="flex h-[520px]">
        {/* ── Left aside: Chat history ── */}
        <aside className="hidden md:flex w-52 lg:w-60 flex-col bg-[var(--bg-muted)]/50 border-r border-[var(--border-subtle)]">
          <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
            <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
              Historial
            </span>
            <span className="material-symbols-outlined text-[14px] text-[var(--accent-strong)]">add_circle</span>
          </div>
          <div className="flex-1 overflow-hidden p-2 space-y-1">
            {HISTORY.map((h, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 px-2 py-1.5 rounded-md text-[11px] leading-snug ${
                  i === 0
                    ? "bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                }`}
              >
                <span className="material-symbols-outlined text-[14px] mt-px shrink-0">{h.icon}</span>
                <div className="min-w-0">
                  <div className="truncate">{h.title}</div>
                  <div className="text-[9px] font-mono text-[var(--text-muted)]">{h.time}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Center: Chat console ── */}
        <div className="flex-1 min-w-0 bg-[var(--bg-primary)]/40 flex flex-col">
          <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
            <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[var(--accent-strong)] rounded-sm" />
              Analysis Console
            </span>
            <span className="text-[10px] font-mono text-[var(--text-secondary)] flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] text-[var(--accent-primary)]">api</span>
              Llama 3 (Local)
            </span>
          </div>

          <div className="flex-1 space-y-6 overflow-hidden p-4">
            <div className="flex justify-end">
              <div className="bg-[var(--bg-muted)]/60 text-[var(--text-secondary)] px-4 py-3 rounded-2xl rounded-tr-sm max-w-[80%] backdrop-blur-sm border border-[var(--border-subtle)] text-[14px]">
                ¿Cuáles son los puntos clave del reporte financiero Q4?
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-[var(--accent-primary)]/10 text-[var(--text-primary)] px-4 py-4 rounded-2xl rounded-tl-sm max-w-[90%] backdrop-blur-sm border border-[var(--accent-strong)]/20 relative shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                <p className="text-[14px] mb-3">Basado en el documento, los puntos clave son:</p>
                <ul className="text-[14px] space-y-2 text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-strong)] mt-1">▹</span>
                    <span>
                      Incremento del 15% en ingresos operativos.{" "}
                      <span className="bg-[var(--bg-primary)] text-[var(--accent-primary)] px-1 rounded text-xs ml-1 border border-[var(--border-subtle)]">
                        [p. 12]
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-strong)] mt-1">▹</span>
                    <span>
                      Reducción de costos logísticos en LATAM.{" "}
                      <span className="bg-[var(--bg-primary)] text-[var(--accent-primary)] px-1 rounded text-xs ml-1 border border-[var(--border-subtle)]">
                        [p. 15]
                      </span>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-[var(--border-subtle)]">
            <div className="relative">
              <input
                className="w-full bg-[var(--bg-muted)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-strong)] focus:shadow-[0_0_10px_rgba(0,220,229,0.2)] transition-all backdrop-blur-md"
                placeholder="Haz una pregunta sobre el documento..."
                type="text"
                readOnly
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[var(--accent-primary)]/20 rounded-lg flex items-center justify-center text-[var(--accent-primary)]"
                tabIndex={-1}
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Right aside: PDF view + functions ── */}
        <aside className="hidden lg:flex w-64 flex-col bg-[var(--bg-muted)]/50 border-l border-[var(--border-subtle)]">
          <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
            <span className="font-mono text-[10px] text-[var(--accent-strong)] uppercase tracking-widest">
              Document Source
            </span>
            <span className="material-symbols-outlined text-[14px] text-[var(--text-muted)]">picture_as_pdf</span>
          </div>

          {/* PDF dummy */}
          <div className="p-4">
            <div className="bg-[var(--bg-primary)] rounded-lg p-4 relative overflow-hidden border border-[var(--border-subtle)]">
              <div className="absolute inset-0 bg-linear-to-b from-[var(--bg-primary)]/20 to-[var(--bg-primary)]/90" />
              <div className="relative z-10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-[var(--text-secondary)] truncate">reporte_anual_2025.pdf</span>
                  <span className="text-[8px] font-mono text-[var(--text-muted)]">12 pág</span>
                </div>
                <div className="h-3 bg-[var(--text-secondary)]/20 rounded w-3/4" />
                <div className="h-2 bg-[var(--text-secondary)]/10 rounded w-full" />
                <div className="h-2 bg-[var(--text-secondary)]/10 rounded w-5/6" />
                <div className="h-2 bg-[var(--text-secondary)]/10 rounded w-full" />
                <div className="mt-3 flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full border-[2px] border-[var(--accent-strong)]/30 border-t-[var(--accent-strong)] animate-spin" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-1.5 bg-[var(--text-secondary)]/10 rounded w-full" />
                    <div className="h-1.5 bg-[var(--text-secondary)]/10 rounded w-3/4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Functions */}
          <div className="px-4 pb-4 flex flex-col gap-1.5">
            <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-1">
              Generar
            </span>
            {FUNCTIONS.map((f) => (
              <button
                key={f.label}
                type="button"
                tabIndex={-1}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-muted)] rounded-lg border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--accent-strong)] hover:border-[var(--accent-primary)]/30 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[14px]">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
