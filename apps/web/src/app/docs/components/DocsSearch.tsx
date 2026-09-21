'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface SearchResult {
  id: string
  title: string
  content: string
  section: string
  href: string
}

// Mock search data - en producción esto vendría de una API o índice
const searchData: SearchResult[] = [
    {
      id: '1',
      title: 'Inicio Rápido',
      content: 'Levanta Cella en tu máquina con ./start.sh y configura un modelo de IA...',
      section: 'Comenzar',
      href: '/docs#quick-start'
    },
    {
      id: '2',
      title: 'Instalación y Configuración',
      content: 'Guía paso a paso para instalar Cella en tu sistema local...',
      section: 'Comenzar',
      href: '/docs#installation'
    },
    {
      id: '3',
      title: 'Configurar Modelos e IA',
      content: 'Conecta Ollama local o añade tu API key (OpenAI, Claude, DeepSeek, Gemini)...',
      section: 'Modelos e IA',
      href: '/docs#models-overview'
    },
    {
      id: '4',
      title: 'Configurar Ollama',
      content: 'Usa modelos locales sin API key con Ollama...',
      section: 'Modelos e IA',
      href: '/docs#ollama'
    },
    {
      id: '5',
      title: 'Chat con Documentos RAG',
      content: 'Cómo usar el sistema de chat inteligente con documentos...',
      section: 'Guía de Usuario',
      href: '/docs#chat-rag'
    },
    {
      id: '6',
      title: 'Problemas Comunes',
      content: 'Soluciones a los problemas más frecuentes en Cella...',
      section: 'Solución de Problemas',
      href: '/docs#common-issues'
    }
  ]

export default function DocsSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Open search with Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle search
  useEffect(() => {
    if (query.trim()) {
      const filtered = searchData.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.content.toLowerCase().includes(query.toLowerCase()) ||
        item.section.toLowerCase().includes(query.toLowerCase())
      )
      setResults(filtered)
      setSelectedIndex(0)
    } else {
      setResults([])
    }
  }, [query])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) {
        window.location.href = results[selectedIndex].href
        setIsOpen(false)
      }
    }
  }

  const handleResultClick = (href: string) => {
    window.location.href = href
    setIsOpen(false)
  }

  const close = () => {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-3 py-2 bg-[var(--zen-panel-alt)] hover:bg-[var(--zen-hover)] rounded-md text-sm text-[var(--text-secondary)] transition-colors w-full max-w-md"
      >
        <Search className="w-4 h-4" />
        <span>Buscar documentación...</span>
        <div className="ml-auto flex space-x-1">
          <kbd className="px-1.5 py-0.5 text-xs bg-[var(--zen-panel)] border border-[var(--zen-line)] rounded">⌘</kbd>
          <kbd className="px-1.5 py-0.5 text-xs bg-[var(--zen-panel)] border border-[var(--zen-line)] rounded">K</kbd>
        </div>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={close}
      />

      {/* Search Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
        <div className="bg-[var(--zen-panel)] rounded-lg shadow-[var(--zen-elev-2)] w-full max-w-2xl mx-4 border border-[var(--zen-line)]">
          {/* Search Input */}
          <div className="flex items-center p-4 border-b border-[var(--zen-line)]">
            <Search className="w-5 h-5 text-[var(--text-secondary)] mr-3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar en la documentación..."
              className="flex-1 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] bg-transparent"
            />
            <button onClick={close} className="p-1 hover:bg-[var(--zen-panel-alt)] rounded">
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Results */}
          <div ref={resultsRef} className="max-h-96 overflow-y-auto">
            {results.length > 0 ? (
              <div className="p-2">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result.href)}
                    className={`w-full text-left p-3 rounded-md transition-colors border ${
                      index === selectedIndex ? 'bg-[var(--zen-panel-alt)] border-[var(--primary-fixed)]' : 'border-transparent hover:bg-[var(--zen-panel-alt)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-[var(--text-primary)]">{result.title}</h4>
                      <span className="text-xs text-[var(--text-secondary)] bg-[var(--zen-panel-alt)] px-2 py-1 rounded">
                        {result.section}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                      {result.content}
                    </p>
                  </button>
                ))}
              </div>
            ) : query ? (
              <div className="p-8 text-center">
                <p className="text-[var(--text-secondary)]">No se encontraron resultados para &quot;{query}&quot;</p>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-[var(--text-secondary)]">Escribe para buscar en la documentación</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[var(--zen-line)] text-xs text-[var(--text-secondary)] flex justify-between">
            <div className="flex space-x-4">
              <span>↑↓ Navegar</span>
              <span>↵ Seleccionar</span>
              <span>Esc Cerrar</span>
            </div>
            <span>Buscar en Cella</span>
          </div>
        </div>
      </div>
    </>
  )
}
