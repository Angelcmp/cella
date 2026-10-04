"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/download";

pdfjs.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

interface PdfViewerProps {
  fileUrl: string;
  title: string;
  filename?: string;
  pages?: number;
  initialPage?: number;
  highlightNonce?: number;
  className?: string;
}

export default function PdfViewer({
  fileUrl,
  title,
  filename,
  pages: knownPages,
  initialPage,
  highlightNonce,
  className = "",
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(
    initialPage && initialPage > 0 ? initialPage : 1
  );
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fitToPage, setFitToPage] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [pageAspect, setPageAspect] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // highlightNonce is referenced so re-clicking the same citation (same page)
    // still triggers the jump.
    void highlightNonce;
    if (initialPage && initialPage > 0) {
      setCurrentPage(initialPage);
    }
  }, [initialPage, highlightNonce]);

  // Measure the scrollable canvas so fit-width / fit-page can compute a width.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () =>
      setCanvasSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitWidth = Math.max(200, canvasSize.width - 32);
  const fitPageWidth =
    pageAspect && canvasSize.height
      ? Math.max(200, (canvasSize.height - 32) * pageAspect)
      : null;
  const baseWidth = fitToPage && fitPageWidth ? fitPageWidth : fitWidth;
  const renderWidth = baseWidth * scale;

  const goToPage = (page: number) => {
    const target = Math.max(1, Math.min(numPages ?? page, page));
    setCurrentPage(target);
  };

  const commitPageInput = () => {
    const parsed = parseInt(pageInput, 10);
    if (Number.isFinite(parsed)) {
      goToPage(parsed);
    }
    setPageInput("");
  };

  const changeScale = (delta: number) => {
    setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s + delta)));
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadFile(
        fileUrl,
        filename && filename.trim() ? filename : `${title}.pdf`
      );
    } catch {
      // Fallback to native navigation (browser handles inline PDF or download).
      window.open(fileUrl, "_blank");
      toast.error("No se pudo descargar el archivo");
    } finally {
      setDownloading(false);
    }
  };

  const downloadName = filename && filename.trim() ? filename : `${title}.pdf`;

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--zen-line)] bg-[var(--zen-panel)] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-[var(--primary-fixed)] shrink-0" />
          <span className="text-(length:--zen-fs-heading) text-[var(--on-surface)] truncate">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Page navigation */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)] hover:text-[var(--on-surface)] disabled:opacity-30 transition-colors"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={commitPageInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitPageInput();
            }}
            placeholder={String(currentPage)}
            className="w-8 h-7 text-center text-(length:--zen-fs-secondary) text-[var(--on-surface)] bg-transparent border border-transparent rounded-md hover:border-[var(--zen-line)] focus:border-[var(--primary-fixed)] focus:outline-none"
            title="Ir a página"
          />
          <span className="text-(length:--zen-fs-label) text-[var(--on-surface-variant)]/60">
            / {numPages ?? knownPages ?? "–"}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={!!numPages && currentPage >= numPages}
            className="p-1.5 rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)] hover:text-[var(--on-surface)] disabled:opacity-30 transition-colors"
            title="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="mx-1 h-4 w-px bg-[var(--zen-line)]" />

          {/* Zoom */}
          <button
            onClick={() => changeScale(-0.1)}
            disabled={scale <= MIN_SCALE}
            className="p-1.5 rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)] hover:text-[var(--on-surface)] disabled:opacity-30 transition-colors"
            title="Alejar"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="min-w-9 text-center text-(length:--zen-fs-label) text-[var(--on-surface-variant)] tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => changeScale(0.1)}
            disabled={scale >= MAX_SCALE}
            className="p-1.5 rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)] hover:text-[var(--on-surface)] disabled:opacity-30 transition-colors"
            title="Acercar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setFitToPage((f) => !f);
              setScale(1);
            }}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              fitToPage
                ? "bg-[var(--primary-fixed)]/15 text-[var(--primary-fixed)]"
                : "text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)] hover:text-[var(--on-surface)]"
            )}
            title={fitToPage ? "Ajustar al ancho" : "Ajustar a la página"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Rotate */}
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)] hover:text-[var(--on-surface)] transition-colors"
            title="Rotar 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="p-1.5 rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--zen-hover)] hover:text-[var(--primary-fixed)] disabled:opacity-50 transition-colors"
            title={`Descargar ${downloadName}`}
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={canvasRef} className="flex-1 overflow-y-auto bg-[var(--zen-canvas)]">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: np }: { numPages: number }) => {
            setNumPages(np);
            const target = initialPage && initialPage > 0 ? Math.min(initialPage, np) : 1;
            setCurrentPage(target);
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
            rotate={rotation}
            width={renderWidth}
            onLoadSuccess={(page) => {
              const vp = page.getViewport({ scale: 1 });
              setPageAspect(vp.width / vp.height);
            }}
            className="mb-2 mt-2 shadow-[0_1px_3px_rgba(11,21,21,0.08)]"
          />
        </Document>
      </div>
    </div>
  );
}
