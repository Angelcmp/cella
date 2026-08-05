import DocsSidebar from "./components/DocsSidebar";
import DocsSearch from "./components/DocsSearch";
import TableOfContents from "./components/TableOfContents";
import DocsContent from "./components/DocsContent";
import ReadingProgress from "./components/ReadingProgress";

export default function DocsPage() {
  return (
    <>
      <ReadingProgress />
      <div className="flex min-h-screen bg-[var(--bg-primary)]">
        <DocsSidebar />
        <div className="flex-1 lg:ml-80">
          <header className="sticky top-0 z-20 bg-[var(--bg-surface)]/80 backdrop-blur-lg border-b border-[var(--border-subtle)]">
            <div className="px-6 py-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">
                  Cella Docs
                </p>
                <h1 className="text-3xl font-semibold text-[var(--text-primary)] mt-2">
                  Guía de Cella
                </h1>
                <p className="text-[var(--text-secondary)] mt-1">
                  Aprende a instalar y usar Cella: tu asistente de estudio local con IA.
                </p>
              </div>
              <div className="w-full max-w-md">
                <DocsSearch />
              </div>
            </div>
          </header>
          <main className="px-6 py-10 max-w-4xl">
            <DocsContent />
          </main>
          <TableOfContents />
        </div>
      </div>
    </>
  );
}
