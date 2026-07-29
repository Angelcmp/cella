import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/lib/metadata";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Sparkles,
  Bot,
  FileText,
  Search,
  Check,
  Shield,
  LayoutDashboard,
  History,
  Download,
  Key,
  Users,
  Globe,
} from "lucide-react";
import QrButton from "@/components/QrButton";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";
import Parallax from "@/components/Parallax";
import LandingHeader from "@/components/landing/LandingHeader";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";

export const metadata = pageMetadata.home;

export default function LandingPage() {
  const publicUrl = process.env.NEXT_PUBLIC_PUBLIC_URL || "";

  const faqItems = [
    {
      question: "¿Qué tan seguros están mis documentos?",
      answer:
        "Todo se cifra en tránsito y reposo y nunca usamos tus archivos para entrenar modelos. Tú controlas el ciclo de vida de cada documento.",
    },
    {
      question: "¿Qué formatos soportan?",
      answer:
        "PDF, DOCX, PPTX y TXT están disponibles hoy. Hojas de cálculo y ePubs llegan en la siguiente iteración.",
    },
    {
      question: "¿Puedo usar Cella gratis?",
      answer:
        "Sí. El plan gratuito concede 3 documentos y 50 preguntas al mes para que pruebes el flujo completo antes de escalar.",
    },
    {
      question: "¿Hay soporte prioritario para empresas?",
      answer:
        "Los planes Enterprise incluyen espacios dedicados, APIs privadas, SSO y un Customer Success Manager.",
    },
  ];

  const storytellingFeatures = [
    {
      icon: Bot,
      title: "Conversaciones orgánicas",
      description:
        "Chat contextual con citas y seguimiento de ideas. Ideal para legal, investigación, compliance y educación superior.",
    },
    {
      icon: FileText,
      title: "Resúmenes editoriales",
      description:
        "Resúmenes ejecutivos, mindmaps y quizzes diseñados con estética de notebook premium para aprender más rápido.",
    },
    {
      icon: Search,
      title: "Búsqueda semántica",
      description:
        "Encuentra pasajes exactos sin depender de palabras clave con nuestro motor RAG híbrido optimizado.",
    },
  ];

  const flows = [
    {
      step: "01",
      title: "Sube y normaliza",
      description:
        "PDF, Word, PowerPoint o texto plano de hasta 50 MB. Convertimos todo a un formato de lectura premium.",
    },
    {
      step: "02",
      title: "Explora en segundos",
      description:
        "Visor enriquecido con anotaciones, badges por página y métricas para no perder contexto.",
    },
    {
      step: "03",
      title: "Actúa con IA",
      description:
        "Chat, resúmenes, guías de estudio, mapas mentales, quizzes y exportaciones listos para compartir.",
    },
  ];

  const detailedFeatures = [
    { icon: Shield, name: "Seguridad avanzada" },
    { icon: LayoutDashboard, name: "Dashboard orgánico" },
    { icon: History, name: "Historial persistente" },
    { icon: Users, name: "Colaboración segura" },
    { icon: Key, name: "API privada" },
    { icon: Download, name: "Exportaciones editoriales" },
    { icon: Check, name: "Citas precisas" },
    { icon: Globe, name: "Docs multilingües" },
  ];

  const pricing = [
    {
      title: "Gratis",
      price: "$0",
      description: "Perfecto para empezar a explorar Cella.",
      bullet: [
        "3 documentos / mes",
        "50 preguntas con IA",
        "Resúmenes básicos",
        "Chat con citas",
      ],
      cta: "Comenzar gratis",
      variant: "outline",
      href: "/zen",
      disabled: false,
    },
    {
      title: "Pro",
      price: "$10",
      description: "Para profesionales que necesitan IA diaria.",
      bullet: [
        "Documentos ilimitados",
        "Preguntas ilimitadas",
        "Resúmenes premium",
        "Exportar PDF/Word",
        "Búsqueda semántica",
      ],
      badge: "Más popular",
      cta: "Próximamente",
      variant: "gradient",
      href: "#",
      disabled: true,
    },
    {
      title: "Enterprise",
      price: "Custom",
      description: "Equipos, despachos y consultoras.",
      bullet: [
        "Espacios dedicados",
        "SSO y SCIM",
        "API privada + SLA",
        "Soporte premium",
      ],
      cta: "Hablar con ventas",
      variant: "outline",
      href: "mailto:ventas@docai.com",
      disabled: false,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="absolute inset-0 pointer-events-none opacity-30 bg-[var(--gradient-zen-glow)] blur-3xl" />
          <div className="container mx-auto px-4 relative">
            <Reveal className="max-w-4xl mx-auto text-center space-y-8" once>
              <Badge variant="outline" className="uppercase tracking-[0.4em] text-xs reveal-up" data-visible>
                Inteligencia Orgánica
              </Badge>
              <h1 className="text-3xl md:text-5xl font-semibold leading-tight text-[var(--text-primary)] reveal-mask">
                El sistema de IA que entiende tus documentos como una editorial humana.
              </h1>
              <p className="text-lg md:text-2xl text-[var(--text-secondary)] max-w-2xl mx-auto reveal-up">
                Conversa, resume, estudia y genera entregables premium con el toque cálido de Cella.
              </p>
              <div className="flex flex-wrap justify-center gap-4 reveal-up">
                <Button asChild size="lg" variant="gradient" className="px-6 py-3 hover-lift hover-glow text-sm">
                  <Link href="/zen">
                    Empezar gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="px-5 py-2.5 hover-lift text-sm">
                  <Link href="/docs">Ver documentación</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="px-5 py-2.5 hover-lift text-sm">
                  <Link href="/pricing">Ver precios</Link>
                </Button>
                {process.env.NEXT_PUBLIC_ENABLE_QR === "true" && publicUrl && <QrButton url={publicUrl} />}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left mt-12">
                {[
                  { label: "Documentos procesados", count: 120, suffix: "K+" },
                  { label: "Lenguajes soportados", count: 12, suffix: "" },
                  { label: "Clientes Pro", count: 1.2, suffix: "K" },
                  { label: "Tiempo de respuesta", count: 2.4, suffix: "s" },
                ].map((metric, index) => (
                  <Reveal key={metric.label} className="reveal-up" once>
                    <Card className="shadow-soft border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90" style={{ animationDelay: `${index * 80}ms` }}>
                      <CardContent className="p-5">
                        <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)] mb-2">{metric.label}</p>
                        <p className="text-2xl font-semibold text-[var(--text-primary)]">
                          <CountUp value={metric.count} duration={700} decimals={metric.suffix === 's' ? 1 : undefined} />{metric.suffix}
                        </p>
                      </CardContent>
                    </Card>
                  </Reveal>
                ))}
              </div>
            </Reveal>

            <Reveal className="mt-16 rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 backdrop-blur-sm shadow-glow p-6 glow-sweep" once>
              <div className="flex flex-wrap items-center justify-center gap-6 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                {["Claude", "ChatGPT", "Gemini"].map((logo) => (
                  <span key={logo} className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
                    {logo}
                  </span>
                ))}
              </div>
            </Reveal>

            {process.env.NEXT_PUBLIC_DEMO_PUBLIC === "true" && (
              <div className="mt-8 text-center text-sm text-[var(--text-secondary)]">
                Demo pública activa · recuerda que los datos se reciclan automáticamente.
              </div>
            )}
          </div>
        </section>

        {/* Story */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <Reveal className="reveal-up" once>
                <Badge variant="outline" className="mb-4">
                  La Biblioteca Viva
                </Badge>
                <h2 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] mb-6 h2-underline">
                  Inteligencia Orgánica para equipos que confían en los documentos.
                </h2>
                <p className="text-lg text-[var(--text-secondary)] mb-8">
                  Cella combina RAG híbrido, mindmaps inteligentes y entregables editoriales.
                </p>
                <div className="grid gap-6">
                  {storytellingFeatures.map((feature) => (
                    <div key={feature.title} className="flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-xl bg-[var(--bg-muted)] flex items-center justify-center text-[var(--accent-primary)]">
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-[var(--text-primary)]">{feature.title}</h3>
                        <p className="text-[var(--text-secondary)]">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
              <Parallax>
                <Card className="shadow-glow border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90">
                  <CardContent className="p-6 space-y-6">
                    <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-muted)]/60 p-6 shadow-inner">
                      <p className="text-sm text-[var(--text-secondary)] uppercase tracking-[0.4em] mb-3">
                        Caso real
                      </p>
                      <p className="text-lg leading-relaxed text-[var(--text-primary)]">
                        &ldquo;Nuestro equipo legal redujo la preparación de informes en un 60% manteniendo precisión académica. Cella nos devolvió horas de trabajo profundo.&rdquo;
                      </p>
                      <p className="text-sm text-[var(--text-muted)] mt-4">Director Legal · Firma LATAM</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="border border-[var(--border-subtle)] rounded-2xl p-4">
                        <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Mindmaps IA</p>
                        <p className="text-2xl font-semibold text-[var(--text-primary)]">+320%</p>
                        <p className="text-sm text-[var(--text-secondary)]">Velocidad para entender informes</p>
                      </div>
                      <div className="border border-[var(--border-subtle)] rounded-2xl p-4">
                        <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Resúmenes curados</p>
                        <p className="text-2xl font-semibold text-[var(--text-primary)]">98%</p>
                        <p className="text-sm text-[var(--text-secondary)]">Precisión percibida por los usuarios</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Parallax>
            </div>
          </div>
        </section>

        {/* Flow */}
        <section className="py-20 bg-[var(--bg-muted)]/60">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline">Flujo Cella</Badge>
              <h2 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] mt-4 mb-4 h2-underline">
                Del PDF al insight en tres pasos intuitivos
              </h2>
              <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                Diseñado para consultoras, legal, educación superior y equipos de operaciones.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {flows.map((flow, idx) => (
                <Reveal key={flow.step} className="reveal-up" once>
                  <Card className="border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 wipe-in" style={{ animationDelay: `${idx * 90}ms` }}>
                    <CardContent className="p-6 space-y-4">
                      <span className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">{flow.step}</span>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)]">{flow.title}</h3>
                      <p className="text-[var(--text-secondary)] leading-relaxed">{flow.description}</p>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <FeaturesSection features={detailedFeatures} />

        {/* Pricing */}
        <PricingSection plans={pricing} />

        {/* Roadmap */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-10">
              <div>
                <Badge variant="outline">Novedades</Badge>
                <h2 className="text-3xl font-semibold text-[var(--text-primary)] mt-4">
                  Roadmap vivo con enfoque editorial
                </h2>
                <p className="text-lg text-[var(--text-secondary)] mt-4">
                  Nos inspiramos en plataformas como Claude y ChatGPT, pero mantenemos la estética cálida de un cuaderno.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  {
                    category: "Producto",
                    title: "Exportación hiper personalizable",
                    date: "Marzo 2026",
                    description: "Exporta conversaciones como briefs, resúmenes o guías en un clic.",
                  },
                  {
                    category: "Update",
                    title: "Mindmaps interactivos",
                    date: "Febrero 2026",
                    description: "Mapas mentales navegables dentro del visor.",
                  },
                  {
                    category: "Policy",
                    title: "Nuevo modo privado",
                    date: "Enero 2026",
                    description: "Cifrado end-to-end opcional para clientes Enterprise.",
                  },
                ].map((item) => (
                  <Card key={item.title} className="border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 shadow-card">
                    <CardContent className="p-5 space-y-2">
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] uppercase tracking-[0.3em]">
                        <span>{item.category}</span>
                        <span>{item.date}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{item.title}</h3>
                      <p className="text-[var(--text-secondary)]">{item.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <FAQSection items={faqItems} />

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="rounded-[32px] bg-[var(--gradient-zen-glow)] text-white p-10 shadow-glow">
              <div className="max-w-3xl space-y-4">
                <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                  Listo para crear
                </Badge>
                <h2 className="text-2xl md:text-3xl font-semibold leading-tight">
                  Comienza hoy mismo y convierte tus documentos en experiencias interactivas con IA.
                </h2>
                <p className="text-lg text-white/80">
                  Sube el primer archivo, crea un mindmap y comparte resúmenes editoriales en minutos.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild size="lg" variant="outline" className="text-[var(--accent-primary)] bg-white text-sm px-6 py-3">
                    <Link href="/zen">
                      Comenzar en Cella
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10">
                    <Link href="/docs">Ver documentación completa</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[var(--gradient-midnight)] text-white py-12">
        <div className="container mx-auto px-4 grid gap-8 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60 mb-2">Cella</p>
            <p className="text-lg font-semibold">El front-end editorial para tu IA interna.</p>
          </div>
          <div>
            <p className="font-semibold mb-3">Producto</p>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Características
                </a>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Precios
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3">Recursos</p>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>
                <Link href="/docs" className="hover:text-white transition-colors">
                  Docs
                </Link>
              </li>
              <li>
                <Link href="/docs/demo" className="hover:text-white transition-colors">
                  Política Demo
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-white transition-colors">
                  Soporte
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3">Legal</p>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Términos
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="text-center text-xs text-white/60 mt-8">
          © {new Date().getFullYear()} Cella · Inteligencia Orgánica para documentos.
        </p>
      </footer>
    </div>
  );
}
