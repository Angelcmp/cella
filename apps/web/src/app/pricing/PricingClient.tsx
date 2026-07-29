"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight } from "lucide-react";

export default function PricingClient() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  useEffect(() => {
    try {
      const stored = localStorage.getItem("doczen:pricing:billing");
      if (stored === "monthly" || stored === "yearly") setBillingCycle(stored);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("doczen:pricing:billing", billingCycle); } catch {}
  }, [billingCycle]);

  const money = (n: number) => `$${(n % 1 === 0 ? n.toFixed(0) : n.toFixed(2))}`;

  const plans = [
    {
      name: "Free",
      monthlyPrice: 0,
      yearlyPrice: 0,
      tagline: "Para empezar a explorar",
      features: [
        "3 documentos / mes",
        "50 preguntas con IA",
        "Resúmenes básicos",
        "Chat con citas",
      ],
      cta: { label: "Comenzar gratis", href: "/zen", variant: "outline" as const },
    },
    {
      name: "Pro",
      monthlyPrice: 10,
      yearlyPrice: 96,
      tagline: "Para uso profesional diario",
      badge: "Más popular",
      features: [
        "Documentos ilimitados",
        "Preguntas ilimitadas",
        "Resúmenes premium",
        "Exportaciones editoriales (PDF/DOCX)",
        "Búsqueda semántica avanzada",
      ],
      cta: { label: "Próximamente", href: "#", variant: "gradient" as const, disabled: true },
      highlighted: true,
    },
    {
      name: "Enterprise",
      isCustom: true,
      tagline: "Para equipos y consultoras",
      features: [
        "Espacios dedicados",
        "SSO / SCIM",
        "API privada + SLA",
        "Soporte prioritario",
      ],
      cta: { label: "Hablar con ventas", href: "mailto:ventas@docai.com", variant: "outline" as const },
    },
  ];

  return (
    <div>
      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center mb-10">
        <div className="inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1">
          <Button
            size="sm"
            variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
            onClick={() => setBillingCycle('monthly')}
            className="px-4"
          >
            Mensual
          </Button>
          <Button
            size="sm"
            variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
            onClick={() => setBillingCycle('yearly')}
            className="px-4"
          >
            Anual
            <span className={`ml-2 text-[10px] uppercase tracking-wider ${billingCycle === 'yearly' ? 'text-white/90' : 'text-[var(--text-secondary)]'}`}>-20%</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`border border-[var(--border-subtle)] ${plan.highlighted ? 'shadow-glow' : 'shadow-card'} bg-[var(--bg-surface)]/95 rounded-[24px] relative overflow-hidden`}
          >
            {plan.badge && (
              <div className="absolute right-4 top-4">
                <Badge variant="glow" className="text-xs px-2 py-1">{plan.badge}</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl text-[var(--text-primary)]">{plan.name}</CardTitle>
              <p className="text-[var(--text-secondary)]">{plan.tagline}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                {plan.isCustom ? (
                  <>
                    <p className="text-4xl font-semibold text-[var(--text-primary)]">Custom</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-semibold text-[var(--text-primary)]">
                      {billingCycle === 'monthly' ? money(plan.monthlyPrice) : money(plan.yearlyPrice)}
                      {plan.name === 'Pro' && billingCycle === 'yearly' && (
                        <Badge variant="outline" className="ml-2">Ahorra 20%</Badge>
                      )}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{billingCycle === 'monthly' ? 'por mes' : 'por año'}</p>
                    {billingCycle === 'yearly' && (
                      <p className="text-xs text-[var(--text-secondary)]">≈ {money(plan.yearlyPrice / 12)}/mes equiv.</p>
                    )}
                  </>
                )}
              </div>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <Check className="mt-0.5 h-4 w-4 text-[var(--accent-primary)]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
               <div>
                  <Button
                    asChild={!plan.cta.disabled}
                    disabled={plan.cta.disabled}
                    variant={plan.cta.variant}
                    className="w-full"
                  >
                    {plan.cta.disabled ? (
                      <span>{plan.cta.label}</span>
                    ) : (
                      <Link href={plan.cta.href}>
                        {plan.cta.label}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    )}
                  </Button>
                </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-[var(--text-secondary)]">
        ¿Tienes requisitos especiales? <Link href="mailto:ventas@docai.com" className="text-[var(--accent-primary)] hover:underline">Contacta ventas</Link>.
      </div>
    </div>
  );
}
