export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Cella",
    "description": "Herramienta de análisis de documentos con inteligencia artificial. Chat con tus archivos PDF, DOCX, PPTX y TXT usando IA avanzada.",
    "url": "https://cella.ai",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": [
      {
        "@type": "Offer",
        "name": "Plan Gratuito",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Chat con documentos, resúmenes, mapas mentales y quiz con modelos gratuitos"
      }
    ],
    "creator": {
      "@type": "Organization",
      "name": "Cella"
    },
    "featureList": [
      "Análisis de documentos con IA",
      "Chat inteligente con archivos",
      "Resúmenes automáticos",
      "Mapas mentales",
      "Quiz generados",
      "Soporte multi-formato"
    ],
    "screenshot": "https://cella.ai/dashboard1.png",
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