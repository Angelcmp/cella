import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cella",
    short_name: "Cella",
    description: "Biblioteca IA — Análisis Inteligente de Documentos",
    start_url: "/zen",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#9966CC",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
