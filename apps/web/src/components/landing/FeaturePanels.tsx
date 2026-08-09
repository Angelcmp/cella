import { FileText, Sparkles, ChevronRight } from "lucide-react";

/** ─── Panel wrapper (mini app window) ─── */
function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-xl border border-white/50 overflow-hidden shadow-sm ${className}`}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/40 bg-white/20">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/60" />
        <span className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
      </div>
      <div className="p-3">
        {children}
      </div>
    </div>
  );
}

/** ─── [1] Chat con citas ─── */
export function ChatCitationsPanel() {
  return (
    <Panel>
      <div className="space-y-2">
        {/* User message */}
        <div className="flex justify-end">
          <div className="bg-[var(--bubble-user)] rounded-lg rounded-br-sm px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] leading-snug max-w-[80%]">
            ¿Cuáles son las conclusiones?
          </div>
        </div>
        {/* Thinking */}
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-2 h-2 text-[var(--accent-primary)]" />
          </div>
          <div className="text-[10px] text-[var(--text-muted)] italic flex gap-1">
            <span>Analizando</span>
            <span className="flex gap-0.5 items-center">
              <span className="w-1 h-1 rounded-full bg-[var(--accent-primary)]/40 animate-typing-dot" style={{animationDelay:"0s"}} />
              <span className="w-1 h-1 rounded-full bg-[var(--accent-primary)]/40 animate-typing-dot" style={{animationDelay:"0.2s"}} />
            </span>
          </div>
        </div>
        {/* AI response */}
        <div className="flex items-start gap-1.5">
          <div className="w-4 h-4 rounded-full bg-[var(--gradient-zen-glow)] shrink-0 flex items-center justify-center mt-0.5">
            <Sparkles className="w-2 h-2 text-[#003739]" />
          </div>
          <div className="space-y-1">
            <div className="bg-[var(--bubble-ai)] border border-[var(--border-subtle)] rounded-lg rounded-bl-sm px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] leading-snug">
              El informe destaca un crecimiento del <span className="text-[var(--accent-primary)] font-medium">23% en ingresos</span>
            </div>
            {/* Citations */}
            <div className="flex gap-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded glass-chip text-[var(--text-secondary)] font-mono">p.4</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded glass-chip text-[var(--text-secondary)] font-mono">p.7 · 91%</span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** ─── [2] Resúmenes ─── */
export function SummaryPanel() {
  return (
    <Panel>
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-[var(--accent-primary)]" />
          <span className="text-[10px] font-mono text-[var(--text-muted)]">resumen_ejecutivo</span>
        </div>
        <div className="glass-chip rounded-lg p-2 space-y-1.5">
          <div className="h-1.5 bg-[var(--accent-primary)]/30 rounded w-3/4" />
          <div className="h-1.5 bg-[var(--border-subtle)] rounded w-full" />
          <div className="h-1.5 bg-[var(--border-subtle)] rounded w-5/6" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
            <span className="w-1 h-1 rounded-full bg-[var(--accent-primary)] shrink-0" />
            <span>Ingresos +23% impulsados por APAC</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
            <span className="w-1 h-1 rounded-full bg-[var(--accent-primary)] shrink-0" />
            <span>Margen operativo récord 18.4%</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
            <span className="w-1 h-1 rounded-full bg-[var(--accent-primary)] shrink-0" />
            <span>Expansión a Singapur y Tokio</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** ─── [3] Mapas mentales ─── */
export function MindmapPanel() {
  return (
    <Panel>
      <div className="flex items-center justify-center py-2">
        <svg viewBox="0 0 160 80" className="w-full max-w-[160px]" xmlns="http://www.w3.org/2000/svg">
          {/* Central node */}
          <circle cx="80" cy="40" r="12" fill="#A7D8DE" opacity="0.9" />
          <text x="80" y="43" textAnchor="middle" fill="white" fontSize="7" fontFamily="monospace">Cella</text>

          {/* Connections + child nodes */}
          <line x1="68" y1="40" x2="20" y2="15" stroke="#CBD5E1" strokeWidth="0.8" />
          <circle cx="20" cy="15" r="7" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="0.8" />
          <text x="20" y="18" textAnchor="middle" fill="#475569" fontSize="5" fontFamily="monospace">Docs</text>

          <line x1="68" y1="40" x2="20" y2="65" stroke="#CBD5E1" strokeWidth="0.8" />
          <circle cx="20" cy="65" r="7" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="0.8" />
          <text x="20" y="68" textAnchor="middle" fill="#475569" fontSize="5" fontFamily="monospace">AI</text>

          <line x1="92" y1="40" x2="140" y2="15" stroke="#CBD5E1" strokeWidth="0.8" />
          <circle cx="140" cy="15" r="7" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="0.8" />
          <text x="140" y="18" textAnchor="middle" fill="#475569" fontSize="5" fontFamily="monospace">Chat</text>

          <line x1="92" y1="40" x2="140" y2="65" stroke="#CBD5E1" strokeWidth="0.8" />
          <circle cx="140" cy="65" r="7" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="0.8" />
          <text x="140" y="68" textAnchor="middle" fill="#475569" fontSize="5" fontFamily="monospace">Quiz</text>

          {/* 2nd level from Docs */}
          <line x1="13" y1="15" x2="13" y2="12" stroke="#CBD5E1" strokeWidth="0.6" />
          <circle cx="13" cy="10" r="4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.6" />
          <line x1="27" y1="15" x2="38" y2="8" stroke="#CBD5E1" strokeWidth="0.6" />
          <circle cx="40" cy="8" r="4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.6" />

          {/* 2nd level from AI */}
          <line x1="13" y1="65" x2="8" y2="72" stroke="#CBD5E1" strokeWidth="0.6" />
          <circle cx="6" cy="74" r="4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.6" />
        </svg>
      </div>
      <div className="text-center text-[10px] text-[var(--text-muted)] font-mono">Nodos interactivos</div>
    </Panel>
  );
}

/** ─── [4] Quiz ─── */
export function QuizPanel() {
  return (
    <Panel>
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Quiz · 3/5</span>
        </div>
        <p className="text-[11px] text-[var(--text-primary)] font-medium leading-snug">
          ¿Cuál fue el principal motor del crecimiento en 2025?
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30">
            <span className="w-3 h-3 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
            <span className="text-[10px] text-[var(--accent-strong)] font-medium">Expansión en APAC</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded glass-chip text-[10px] text-[var(--text-secondary)]">
            <span className="w-3 h-3 rounded-full border border-[var(--border-strong)] shrink-0" />
            <span>Reducción de costos</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded glass-chip text-[10px] text-[var(--text-secondary)]">
            <span className="w-3 h-3 rounded-full border border-[var(--border-strong)] shrink-0" />
            <span>Nuevas contrataciones</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** ─── [5] Razonamiento visible ─── */
export function ThinkingPanel() {
  return (
    <Panel>
      <div className="space-y-2">
        <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-mono">
          <ChevronRight className="w-2.5 h-2.5" />
          <span>thinking</span>
        </div>
        <div className="bg-[var(--accent-primary)]/5 border border-dashed border-[var(--accent-primary)]/20 rounded-lg p-2 space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
            <span className="text-[var(--accent-primary)]">▸</span>
            <span>Identificando secciones clave del documento...</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
            <span className="text-[var(--accent-primary)]">▸</span>
            <span>Extrayendo métricas financieras (ingresos, margen, costos)</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
            <span className="text-[var(--accent-primary)]">▸</span>
            <span>Comparando con datos del año anterior en p.3 y p.8</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
            <span className="text-[var(--accent-primary)] animate-cursor">▌</span>
            <span className="text-[var(--text-muted)]">generando respuesta...</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** ─── [6] Multi-modelo ─── */
export function ModelPanel() {
  const models = [
    { name: "DeepSeek V4 Flash", active: true },
    { name: "GLM-4.5 Flash", active: false },
    { name: "GLM-4.7", active: false },
  ];
  return (
    <Panel>
      <div className="space-y-2">
        <div className="text-[10px] text-[var(--text-muted)] font-mono">Seleccionar modelo</div>
        <div className="flex flex-wrap gap-1">
          {models.map((m) => (
            <span
              key={m.name}
              className={`text-[9px] px-2 py-1 rounded-md font-mono border ${
                m.active
                  ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 text-[var(--accent-primary)]"
                  : "glass-chip text-[var(--text-secondary)]"
              }`}
            >
              {m.name}
            </span>
          ))}
          <span className="text-[9px] px-2 py-1 rounded-md text-[var(--text-muted)] font-mono">+2 más</span>
        </div>
      </div>
    </Panel>
  );
}

/** ─── How it Works panels ─── */

/** Subir documento */
export function UploadPanel() {
  return (
    <Panel>
      <div className="flex flex-col items-center justify-center py-3 gap-1.5">
        <div className="w-10 h-10 rounded-lg border-2 border-dashed border-[var(--border-strong)] flex items-center justify-center">
          <svg className="w-5 h-5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <polyline points="9 15 12 12 15 15" />
          </svg>
        </div>
        <span className="text-[10px] font-mono text-[var(--text-muted)]">reporte_2025.pdf</span>
        <span className="text-[9px] text-[var(--text-muted)]">2.4 MB · 15 páginas</span>
      </div>
    </Panel>
  );
}

/** Indexación */
export function IndexingPanel() {
  return (
    <Panel>
      <div className="space-y-1.5 font-mono text-[9px]">
        <div className="text-[var(--text-muted)]">$ cella index --doc reporte_2025</div>
        <div className="text-[var(--accent-primary)] flex items-center gap-1">
          <span>✓</span>
          <span>Chunks: 47 fragmentos</span>
        </div>
        <div className="text-[var(--accent-primary)] flex items-center gap-1">
          <span>✓</span>
          <span>Embeddings: 384-dim</span>
        </div>
        <div className="text-[var(--accent-primary)] flex items-center gap-1">
          <span>✓</span>
          <span>Índice semántico: listo</span>
        </div>
        <div className="text-[var(--text-muted)] animate-cursor">_</div>
      </div>
    </Panel>
  );
}

/** Chat y explora */
export function ChatExplorePanel() {
  return (
    <Panel>
      <div className="space-y-2">
        <div className="flex justify-end">
          <div className="bg-[var(--bubble-user)] rounded-lg rounded-br-sm px-2 py-1 text-[10px] text-[var(--text-primary)] max-w-[75%] leading-snug">
            ¿Cuál fue el margen operativo?
          </div>
        </div>
        <div className="flex items-start gap-1">
          <div className="w-3.5 h-3.5 rounded-full bg-[var(--gradient-zen-glow)] shrink-0 flex items-center justify-center mt-0.5">
            <Sparkles className="w-2 h-2 text-[#003739]" />
          </div>
          <div className="bg-[var(--bubble-ai)] border border-[var(--border-subtle)] rounded-lg rounded-bl-sm px-2 py-1 text-[10px] text-[var(--text-primary)] leading-snug max-w-[80%]">
            <span className="text-[var(--accent-primary)] font-medium">18.4%</span> — récord histórico, superando proyecciones
          </div>
        </div>
        <div className="flex gap-1 ml-4">
          <span className="text-[8px] px-1 py-0.5 rounded glass-chip text-[var(--text-secondary)] font-mono">p.7</span>
          <span className="text-[8px] px-1 py-0.5 rounded glass-chip text-[var(--text-secondary)] font-mono">Resumen</span>
          <span className="text-[8px] px-1 py-0.5 rounded glass-chip text-[var(--text-secondary)] font-mono">Mapa</span>
          <span className="text-[8px] px-1 py-0.5 rounded glass-chip text-[var(--text-secondary)] font-mono">Quiz</span>
        </div>
      </div>
    </Panel>
  );
}
