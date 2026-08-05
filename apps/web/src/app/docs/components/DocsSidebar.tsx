'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronRight,
  ChevronDown,
  Home,
  User,
  Bot,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react'

interface DocSection {
  id: string
  title: string
  icon: React.ReactNode
  items?: DocItem[]
}

interface DocItem {
  id: string
  title: string
  href: string
}

const docSections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Comenzar',
    icon: <Home className="w-4 h-4" />,
    items: [
      { id: 'introduction', title: 'Introducción', href: '/docs#introduction' },
      { id: 'quick-start', title: 'Inicio Rápido', href: '/docs#quick-start' },
      { id: 'installation', title: 'Instalación', href: '/docs#installation' },
    ],
  },
  {
    id: 'user-guide',
    title: 'Guía de Usuario',
    icon: <User className="w-4 h-4" />,
    items: [
      { id: 'first-steps', title: 'Primeros Pasos', href: '/docs#first-steps' },
      { id: 'uploading', title: 'Subir Documentos', href: '/docs#uploading' },
      { id: 'chat-rag', title: 'Chat con Documentos', href: '/docs#chat-rag' },
      { id: 'document-viewer', title: 'Visualizador', href: '/docs#document-viewer' },
      { id: 'summaries', title: 'Resúmenes', href: '/docs#summaries' },
      { id: 'mindmap', title: 'Mapas Mentales', href: '/docs#mindmap' },
      { id: 'quiz', title: 'Quiz', href: '/docs#quiz' },
    ],
  },
  {
    id: 'models-ai',
    title: 'Modelos e IA',
    icon: <Bot className="w-4 h-4" />,
    items: [
      { id: 'models-overview', title: 'Visión General', href: '/docs#models-overview' },
      { id: 'ollama', title: 'Ollama (local)', href: '/docs#ollama' },
      { id: 'api-providers', title: 'Proveedores de API', href: '/docs#api-providers' },
      { id: 'provider-settings', title: 'Ajustes de Modelos', href: '/docs#provider-settings' },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Solución de Problemas',
    icon: <HelpCircle className="w-4 h-4" />,
    items: [
      { id: 'faq', title: 'FAQ', href: '/docs#faq' },
      { id: 'common-issues', title: 'Problemas Comunes', href: '/docs#common-issues' },
    ],
  },
]

export default function DocsSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started'])
  const pathname = usePathname()

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    )
  }

  const isActiveItem = (href: string) => {
    const hash = href.split('#')[1]
    return hash && pathname.includes(`#${hash}`)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-xl bg-[var(--bg-surface)]/90 border border-[var(--border-subtle)] shadow-soft"
      >
        <Menu className="w-5 h-5 text-[var(--text-primary)]" />
      </button>

      {isOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />}

      <div
        className={`
          fixed lg:fixed inset-y-0 left-0 z-40 w-80 bg-[var(--bg-surface)]/95 shadow-soft backdrop-blur
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-[var(--gradient-zen-glow)] rounded-2xl text-white flex items-center justify-center font-semibold">
              C
            </div>
            <span className="font-semibold text-[var(--text-primary)]">Cella Docs</span>
          </Link>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 hover:bg-[var(--bg-muted)] rounded">
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <nav className="p-4 h-full overflow-y-auto">
          <div className="space-y-3">
            {docSections.map((section) => (
              <div key={section.id} className="rounded-xl border border-transparent hover:border-[var(--border-subtle)]">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-3 text-left text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]/70 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    {section.icon}
                    <span>{section.title}</span>
                  </div>
                  {expandedSections.includes(section.id) ? (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                </button>
                {expandedSections.includes(section.id) && (
                  <div className="mt-1 ml-4 space-y-1">
                    {section.items?.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`
                          flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all
                          ${isActiveItem(item.href)
                            ? 'bg-[var(--bg-muted)] text-[var(--accent-primary)] font-semibold'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]/70'}
                        `}
                      >
                        <span>{item.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>
      </div>
    </>
  )
}
