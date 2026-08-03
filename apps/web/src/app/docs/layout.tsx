import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'Documentación | Cella',
  description: 'Documentación de Cella - Análisis inteligente de documentos con IA: chat con RAG, resúmenes, mapas mentales y quiz.',
  keywords: ['Cella', 'documentación', 'IA', 'RAG', 'análisis de documentos'],
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
