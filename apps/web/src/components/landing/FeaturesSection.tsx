import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Feature {
  icon: LucideIcon;
  name: string;
}

interface FeaturesSectionProps {
  features: Feature[];
}

export default function FeaturesSection({ features }: FeaturesSectionProps) {
  return (
    <section id="features" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline">Funciones clave</Badge>
          <h2 className="text-3xl md:text-4xl font-semibold text-[var(--text-primary)] mt-4 mb-4">
            Todo lo que necesitas para dominar tus documentos
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Construido con los flujos de Claude, GPT y NotebookLM en mente, pero con personalidad propia.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.name}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 shadow-card p-5 flex flex-col items-center text-center"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-muted)] flex items-center justify-center mb-4 text-[var(--accent-primary)]">
                <feature.icon className="w-6 h-6" />
              </div>
              <p className="font-semibold text-[var(--text-primary)]">{feature.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
