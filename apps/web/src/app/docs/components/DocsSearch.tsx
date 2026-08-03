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

export default function DocsSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Mock search data - en producción esto vendría de una API o índice
  const searchData: SearchResult[] = [
    {
      id: '1',
      title: 'Instalación y Configuración',
      content: 'Guía paso a paso para instalar DocAI en tu sistema local...',
      section: 'Comenzar',
      href: '/docs#installation'
    },
    {
      id: '2',
      title: 'Chat con Documentos RAG',
      content: 'Cómo usar el sistema de chat inteligente con documentos...',
      section: 'Guía de Usuario',
      href: '/docs#chat-rag'
    },
    {
      id: '3',
      title: 'API de Autenticación',
      content: 'Endpoints para registrarse, iniciar sesión y obtener tokens...',
      section: 'API Reference',
      href: '/docs#authentication'
    },
    {
      id: '4',
      title: 'Arquitectura del Sistema',
      content: 'Descripción de la arquitectura y componentes de DocAI...',
      section: 'Técnico',
      href: '/docs#architecture'
    },
    {
      id: '5',
      title: 'Problemas Comunes',
      content: 'Soluciones a los problemas más frecuentes en DocAI...',
      section: 'Troubleshooting',
      href: '/docs#common-issues'
    }
  ]

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
        className="flex items-center space-x-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-md text-sm text-muted-foreground transition-colors w-full max-w-md"
      >
        <Search className="w-4 h-4" />
        <span>Buscar documentación...</span>
        <div className="ml-auto flex space-x-1">
          <kbd className="px-1.5 py-0.5 text-xs bg-card border border-border rounded">⌘</kbd>
          <kbd className="px-1.5 py-0.5 text-xs bg-card border border-border rounded">K</kbd>
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
        <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl mx-4 border border-border">
          {/* Search Input */}
          <div className="flex items-center p-4 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground mr-3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar en la documentación..."
              className="flex-1 outline-none text-foreground placeholder:text-muted-foreground bg-transparent"
            />
            <button onClick={close} className="p-1 hover:bg-muted rounded">
              <X className="w-4 h-4 text-muted-foreground" />
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
                      index === selectedIndex ? 'bg-primary/10 border-primary' : 'border-transparent hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-foreground">{result.title}</h4>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {result.section}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {result.content}
                    </p>
                  </button>
                ))}
              </div>
            ) : query ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No se encontraron resultados para "{query}"</p>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Escribe para buscar en la documentación</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border text-xs text-muted-foreground flex justify-between">
            <div className="flex space-x-4">
              <span>↑↓ Navegar</span>
              <span>↵ Seleccionar</span>
              <span>Esc Cerrar</span>
            </div>
            <span>Buscar por DocAI</span>
          </div>
        </div>
      </div>
    </>
  )
}
