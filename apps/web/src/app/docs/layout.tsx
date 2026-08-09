import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'Guía de Cella | Documentación',
  description: 'Aprende a instalar y usar Cella, tu asistente de estudio local con IA: Ollama, API keys, chat con RAG, resúmenes, mapas mentales y quiz.',
  keywords: ['Cella', 'documentación', 'IA', 'RAG', 'local', 'Ollama', 'análisis de documentos'],
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="cyber min-h-screen bg-background">
      {children}
    </div>
  )
}
