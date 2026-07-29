import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Plan {
  title: string;
  price: string;
  description: string;
  bullet: string[];
  cta: string;
  variant: string;
  href: string;
  badge?: string;
  disabled?: boolean;
}

interface PricingSectionProps {
  plans: Plan[];
}

export default function PricingSection({ plans }: PricingSectionProps) {
  return (
    <section className="py-20 bg-[var(--bg-muted)]/60" id="pricing">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline">Planes transparentes</Badge>
          <h2 className="text-3xl md:text-4xl font-semibold text-[var(--text-primary)] mt-4 mb-4">
            Escala a tu ritmo con IA premium
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Comienza sin costo y desbloquea capacidades editoriales cuando lo necesites.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.title}
              className={`flex flex-col border-[var(--border-subtle)] ${
                plan.badge ? "shadow-glow border-[var(--accent-primary)]/40" : "shadow-card"
              }`}
            >
              <CardHeader className="text-center space-y-3">
                {plan.badge && (
                  <Badge variant="glow" className="mx-auto">
                    {plan.badge}
                  </Badge>
                )}
                <CardTitle className="text-2xl font-semibold">{plan.title}</CardTitle>
                <p className="text-3xl font-bold text-[var(--text-primary)]">{plan.price}</p>
                <p className="text-[var(--text-secondary)]">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between space-y-6">
                <ul className="space-y-3 text-[var(--text-secondary)]">
                  {plan.bullet.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[var(--accent-primary)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild={!plan.disabled}
                  disabled={plan.disabled}
                  variant={plan.variant === "gradient" ? "gradient" : plan.variant === "outline" ? "outline" : "default"}
                  className="w-full"
                >
                  {plan.disabled ? plan.cta : <Link href={plan.href}>{plan.cta}</Link>}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
