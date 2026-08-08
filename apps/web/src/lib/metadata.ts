import { Metadata } from "next";

export const createMetadata = (
  title: string,
  description: string,
  path?: string,
  ogImage?: string
): Metadata => {
  const baseUrl = "https://cella.ai";
  const fullUrl = path ? `${baseUrl}${path}` : baseUrl;
  const image = ogImage || "/dashboard1.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: "Cella",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "es_ES",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: "@Cella_AI",
      creator: "@Cella_AI",
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical: fullUrl,
    },
  };
};

export const pageMetadata = {
  home: createMetadata(
    "Cella - Análisis de Documentos con Inteligencia Artificial",
    "Transforma tus documentos PDF, DOCX, PPTX y TXT en conversaciones inteligentes. Chat con IA, genera resúmenes automáticos y obtén respuestas precisas de tus archivos.",
    "/",
    "/dashboard1.png"
  ),
};