import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  items: FAQItem[];
}

export default function FAQSection({ items }: FAQSectionProps) {
  return (
    <section id="faq" className="py-20 bg-[var(--bg-muted)]/60">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center mb-12">
          <Badge variant="outline">FAQ</Badge>
          <h2 className="text-3xl font-semibold text-[var(--text-primary)] mt-4 mb-4">
            Preguntas frecuentes
          </h2>
          <p className="text-lg text-[var(--text-secondary)]">
            Transparencia total desde el onboarding.
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full border border-[var(--border-subtle)] rounded-[var(--radius-lg)] bg-[var(--bg-surface)]/90 p-2 md:p-4">
          {items.map((item, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger className="text-lg text-left px-4 py-3">{item.question}</AccordionTrigger>
              <AccordionContent className="text-[var(--text-secondary)] px-4 pb-4">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
