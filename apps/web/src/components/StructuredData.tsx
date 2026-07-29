export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "DocAI",
    "description": "Plataforma de análisis de documentos con inteligencia artificial. Chat con tus archivos PDF, DOCX, PPTX y TXT usando IA avanzada.",
    "url": "https://docai.app",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": [
      {
        "@type": "Offer",
        "name": "Plan Gratuito",
        "price": "0",
        "priceCurrency": "USD",
        "description": "3 documentos al mes, 50 preguntas, chat con documentos, resúmenes básicos"
      },
      {
        "@type": "Offer",
        "name": "Plan Pro",
        "price": "10",
        "priceCurrency": "USD",
        "description": "Documentos ilimitados, preguntas ilimitadas, IA avanzada, resúmenes detallados, exportar a PDF/Word"
      }
    ],
    "creator": {
      "@type": "Organization",
      "name": "DocAI Team"
    },
    "featureList": [
      "Análisis de documentos con IA",
      "Chat inteligente con archivos",
      "Resúmenes automáticos",
      "Búsqueda semántica",
      "Soporte multi-formato",
      "Exportación de resultados"
    ],
    "screenshot": "https://docai.app/dashboard1.png",
    "softwareVersion": "1.0.0",
    "datePublished": "2025-08-01",
    "dateModified": "2025-09-03"
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}