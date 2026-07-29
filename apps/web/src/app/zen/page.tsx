import { createMetadata } from "@/lib/metadata";
import ZenLayout from "@/components/zen/ZenLayout";

export const metadata = createMetadata(
  "Cella - Chat Inteligente con Documentos",
  "Sube tus documentos PDF, DOCX, PPTX o TXT y conversa con inteligencia artificial. Resúmenes, mapas mentales y quizzes generados por IA.",
  "/zen"
);

export default function ZenPage() {
  return <ZenLayout />;
}
