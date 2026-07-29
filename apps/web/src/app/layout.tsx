import type { Metadata } from "next";
import { Fraunces, Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import StructuredData from "@/components/StructuredData";

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://docai.app'),
  title: "DocAI - Análisis de Documentos con Inteligencia Artificial",
  description: "Transforma tus documentos PDF, DOCX, PPTX y TXT en conversaciones inteligentes. Chat con IA, genera resúmenes automáticos y obtén respuestas precisas de tus archivos.",
  keywords: "análisis documentos, inteligencia artificial, chat IA, resúmenes automáticos, procesamiento documentos, RAG, Gemini AI",
  authors: [{ name: "DocAI Team" }],
  creator: "DocAI",
  publisher: "DocAI",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://docai.app",
    siteName: "DocAI",
    title: "DocAI - Análisis de Documentos con IA",
    description: "Transforma tus documentos en conversaciones inteligentes con IA. Sube PDF, DOCX, PPTX, TXT y chatea con tus archivos.",
    images: [
      {
        url: "/dashboard1.png",
        width: 1200,
        height: 630,
        alt: "DocAI Dashboard - Análisis de Documentos con IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@DocAI_App",
    creator: "@DocAI_App",
    title: "DocAI - Análisis de Documentos con IA",
    description: "Transforma tus documentos en conversaciones inteligentes con IA",
    images: ["/dashboard1.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-token",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="light">
      <body
        className={`${fraunces.variable} ${spaceGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <StructuredData />
        {children}
        {/* Footer removido del layout global para evitar duplicados; solo la landing principal muestra footer */}
      </body>
    </html>
  );
}
