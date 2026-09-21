'use client'

import { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'

interface TOCItem {
  id: string
  text: string
  level: number
}

export default function TableOfContents() {
  const [toc, setToc] = useState<TOCItem[]>([])
  const [activeId, setActiveId] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Build the TOC from elements carrying an id whose first heading labels them.
    const nodes = Array.from(document.querySelectorAll('section[id], div[id]'))
    const tocItems: TOCItem[] = []

    nodes.forEach((node) => {
      const heading = node.querySelector(':scope > h2, :scope > h3, :scope > h4')
      if (!heading) return
      const text = (heading.textContent || '').replace(/^[^\p{L}\p{N}]+/u, '').trim()
      if (!text) return
      tocItems.push({
        id: node.id,
        text,
        level: parseInt(heading.tagName.charAt(1), 10),
      })
    })

    setToc(tocItems)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        })
      },
      { rootMargin: '-100px 0% -80% 0%' }
    )

    const observed = new Set<string>()
    tocItems.forEach((item) => {
      const el = document.getElementById(item.id)
      if (el && !observed.has(item.id)) {
        observer.observe(el)
        observed.add(item.id)
      }
    })

    const handleScroll = () => setIsVisible(window.scrollY > 300)
    handleScroll()
    window.addEventListener('scroll', handleScroll)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (toc.length === 0) return null

  return (
    <div
      className={`fixed right-4 top-1/2 -translate-y-1/2 z-30 transition-all duration-300 ease-in-out ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      } hidden xl:block`}
    >
      <div className="w-56 rounded-lg border border-[var(--zen-line)] bg-[var(--zen-panel)] p-4">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-3">
          En esta página
        </h4>

        <nav className="space-y-1 max-h-96 overflow-y-auto">
          {toc.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`block text-[12px] leading-5 transition-colors ${
                activeId === item.id
                  ? 'text-[var(--primary-fixed)] font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              style={{ paddingLeft: `${(item.level - 2) * 12}px` }}
            >
              {item.text}
            </a>
          ))}
        </nav>

        <div className="mt-4 pt-3 border-t border-[var(--zen-line)]">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
            <span>Volver arriba</span>
          </button>
        </div>
      </div>
    </div>
  )
}
