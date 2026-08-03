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
    // Generate TOC from headings
    const headings = document.querySelectorAll('h2, h3, h4')
    const tocItems: TOCItem[] = []

    headings.forEach((heading) => {
      if (heading.id) {
        const level = parseInt(heading.tagName.charAt(1))
        tocItems.push({
          id: heading.id,
          text: heading.textContent || '',
          level: level
        })
      }
    })

    setToc(tocItems)

    // Set up intersection observer for active section
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-100px 0% -80% 0%' }
    )

    headings.forEach((heading) => {
      if (heading.id) observer.observe(heading)
    })

    // Show/hide based on scroll position
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300)
    }

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
    <div className={`
      fixed right-4 top-1/2 transform -translate-y-1/2 z-30
      transition-all duration-300 ease-in-out
      ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
      hidden xl:block
    `}>
      <div className="bg-card text-card-foreground rounded-lg shadow-lg border border-border p-4 max-w-xs">
        <h4 className="font-semibold text-sm text-foreground mb-3">
          En esta página
        </h4>
        
        <nav className="space-y-1 max-h-96 overflow-y-auto">
          {toc.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`
                block text-xs leading-5 transition-colors
                ${item.level === 2 ? 'pl-0' : item.level === 3 ? 'pl-3' : 'pl-6'}
                ${activeId === item.id 
                  ? 'text-primary font-medium' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
              style={{
                paddingLeft: `${(item.level - 2) * 12}px`
              }}
            >
              {item.text}
            </a>
          ))}
        </nav>

        <div className="mt-4 pt-3 border-t border-border">
          <button
            onClick={scrollToTop}
            className="flex items-center space-x-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
            <span>Volver arriba</span>
          </button>
        </div>
      </div>
    </div>
  )
}
