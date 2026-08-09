"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FileText, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs";

interface PdfViewerProps {
  fileUrl: string;
  title: string;
  pages?: number;
  className?: string;
}

export default function PdfViewer({
  fileUrl,
  title,
  pages: knownPages,
  className = "",
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--outline-variant)] bg-[var(--surface-container-high)]/70 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-4 h-4 text-[var(--primary-fixed)] shrink-0" />
          <span className="font-label-mono text-(length:--zen-fs-heading) text-[var(--on-surface)] truncate">
            {title}
          </span>
          {numPages && (
            <span className="font-label-mono text-(length:--zen-fs-label) text-[var(--on-surface-variant)]/60 shrink-0">
              Pág. {currentPage} / {numPages}
            </span>
          )}
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded text-[var(--on-surface-variant)] hover:text-[var(--primary)] disabled:opacity-30 transition-colors"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              setCurrentPage((p) => Math.min(numPages ?? p, p + 1))
            }
            disabled={!!numPages && currentPage >= numPages}
            className="p-1 rounded text-[var(--on-surface-variant)] hover:text-[var(--primary)] disabled:opacity-30 transition-colors"
            title="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {(numPages || knownPages) && (
          <Badge
            variant="outline"
            className="font-label-mono text-(length:--zen-fs-label) border-[var(--primary-fixed)] text-[var(--primary-fixed)] bg-[var(--primary-fixed)]/10 shrink-0"
          >
            {numPages ?? knownPages} páginas
          </Badge>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto bg-[var(--surface-container-high)]/30">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: np }: { numPages: number }) => {
            setNumPages(np);
            setCurrentPage(1);
          }}
          loading={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[var(--primary-fixed)] animate-spin" />
            </div>
          }
          error={
            <div className="text-center py-12 text-[var(--on-surface-variant)]">
              Error al cargar el PDF
            </div>
          }
          noData={
            <div className="text-center py-12 text-[var(--on-surface-variant)]">
              Sin contenido
            </div>
          }
          className="flex flex-col items-center"
        >
          <Page
            pageNumber={currentPage}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            width={520}
            className="mb-2 mt-2 shadow-[0_2px_12px_rgba(22,82,65,0.15)]"
          />
        </Document>
      </div>
    </div>
  );
}
