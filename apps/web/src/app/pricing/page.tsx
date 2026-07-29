import Link from "next/link";
import { createMetadata } from "@/lib/metadata";
import { Button } from "@/components/ui/button";
import PricingClient from "./PricingClient";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Cella</p>
              <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Planes y precios</h1>
              <p className="text-[var(--text-secondary)]">Elige el plan que mejor se adapte a tu equipo</p>
            </div>
            <div className="hidden md:flex gap-2">
              <Button asChild variant="ghost"><Link href="/">Volver al inicio</Link></Button>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12">
        <PricingClient />
      </main>
    </div>
  );
}
export const metadata = createMetadata(
  "Planes y Precios - Cella",
  "Elige el plan que mejor se adapta a tu equipo y aprovecha descuentos por facturación anual.",
  "/pricing",
  "/dashboard1.png"
);
