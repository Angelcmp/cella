import { FileText, Check, Sparkles } from "lucide-react";

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-xl rounded-br-md bg-[var(--bubble-user)] px-3 py-1.5 text-[12px] text-[var(--text-primary)] leading-snug">
        {children}
      </div>
    </div>
  );
}

function AIBubble({
  children,
  citations,
}: {
  children: React.ReactNode;
  citations?: { page: number; snippet: string; similarity: number }[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <div className="w-5 h-5 rounded-full bg-[var(--gradient-zen-glow)] shrink-0 flex items-center justify-center mt-0.5">
          <Sparkles className="w-2.5 h-2.5 text-white" />
        </div>
        <div className="max-w-[88%] rounded-xl rounded-bl-md bg-[var(--bubble-ai)] border border-[var(--border-subtle)] px-3 py-1.5 text-[12px] text-[var(--text-primary)] leading-snug">
          {children}
        </div>
      </div>
      {citations && citations.length > 0 && (
        <div className="ml-7 space-y-1">
          {citations.map((c, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-[10px] text-[var(--text-muted)] bg-[var(--bg-muted)] rounded-md px-2 py-1 border border-[var(--border-subtle)]"
            >
              <span className="shrink-0 mt-px w-4 h-4 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center font-mono text-[9px] font-semibold">
                {c.page}
              </span>
              <span className="line-clamp-1 leading-snug">{c.snippet}</span>
              <span className="shrink-0 text-[9px] font-mono text-[var(--accent-primary)]">
                {c.similarity}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThinkingBlock() {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded-full bg-[var(--gradient-zen-glow)] shrink-0 flex items-center justify-center">
        <Sparkles className="w-2.5 h-2.5 text-white" />
      </div>
      <div className="rounded-xl rounded-bl-md border border-dashed border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 px-3 py-1.5 text-[12px] text-[var(--text-muted)] leading-snug italic flex items-center gap-1.5">
        <span>Analizando el contenido del documento</span>
        <span className="inline-flex gap-1">
          <span className="w-1 h-1 rounded-full bg-[var(--accent-primary)]/60 animate-typing-dot" style={{ animationDelay: "0s" }} />
          <span className="w-1 h-1 rounded-full bg-[var(--accent-primary)]/60 animate-typing-dot" style={{ animationDelay: "0.2s" }} />
          <span className="w-1 h-1 rounded-full bg-[var(--accent-primary)]/60 animate-typing-dot" style={{ animationDelay: "0.4s" }} />
        </span>
      </div>
    </div>
  );
}

export default function HeroDemo() {
  return (
    <div className="w-full max-w-4xl mx-auto animate-window-pop" style={{ animationDelay: "0.4s" }}>
      {/* Browser Chrome */}
      <div className="rounded-t-xl border border-b-0 border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 py-2 flex items-center gap-1.5">
        <div className="flex gap-1 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        </div>
        <div className="flex-1 mx-2">
          <div className="bg-[var(--bg-surface)] rounded px-2 py-0.5 text-[10px] text-[var(--text-muted)] font-mono truncate">
            cella.ai/zen
          </div>
        </div>
      </div>

      {/* Chat Window */}
      <div className="rounded-b-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-4 overflow-hidden relative">
        <div className="animate-fade-in-up" style={{ animationDelay: "0.8s" }}>
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)]">
            <FileText className="w-3 h-3 text-[var(--accent-primary)]" />
            <span className="text-[var(--text-secondary)] font-mono text-[10px]">reporte_anual_2025.pdf</span>
            <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-green-700 bg-green-100 rounded-full px-1.5 py-0.5">
              <Check className="w-2.5 h-2.5" />
              Indexado
            </span>
          </div>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: "1.6s" }}>
          <UserBubble>
            ¿Cuáles son las conclusiones principales del informe?
          </UserBubble>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: "2.6s" }}>
          <ThinkingBlock />
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: "3.8s" }}>
          <AIBubble
            citations={[
              { page: 4, snippet: "Los ingresos crecieron un 23% interanual impulsados por la expansión en APAC", similarity: 94 },
              { page: 7, snippet: "El margen operativo alcanzó el 18.4%, superando las proyecciones del Q3", similarity: 91 },
            ]}
          >
            El informe anual 2025 destaca tres conclusiones clave: un{" "}
            <strong className="text-[var(--accent-primary)]">crecimiento del 23% en ingresos</strong>{" "}
            gracias a la expansión en mercados APAC, un margen operativo récord del 18.4%, y una
            reducción del 12% en costos operativos tras la migración a infraestructura cloud-native.
          </AIBubble>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: "5.2s" }}>
          <UserBubble>
            ¿Cómo se compara con los resultados del año anterior?
          </UserBubble>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: "6.6s" }}>
          <AIBubble
            citations={[
              { page: 3, snippet: "En 2024 los ingresos fueron de $42M frente a los $51.7M de 2025", similarity: 96 },
              { page: 8, snippet: "La plantilla creció un 15% pasando de 340 a 391 empleados", similarity: 88 },
            ]}
          >
            Respecto a 2024, los ingresos pasaron de $42M a $51.7M (+23%), el equipo creció de 340 a
            391 empleados, y se abrieron operaciones en dos nuevas regiones:{" "}
            <strong className="text-[var(--accent-primary)]">Singapur y Tokio</strong>. La
            inversión en I+D aumentó un 40%, representando ahora el 22% del presupuesto total.
          </AIBubble>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[var(--bg-surface)] to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
