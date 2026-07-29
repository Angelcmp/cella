"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  ExternalLink,
  Clock,
  Hash,
  FileIcon,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";
import { toast } from "sonner";
import styles from "./DocumentViewer.module.css";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  title: string;
  filename: string;
  file_size: number;
  pages?: number;
  status: string;
  created_at: string;
}

interface DocumentPage {
  page_number: number;
  chunks: DocumentChunk[];
  full_text: string;
}

interface DocumentChunk {
  chunk_id: string;
  chunk_index: number;
  text: string;
  tokens: number;
  page_start: number;
  page_end: number;
}

interface DocumentContent {
  document_id: string;
  document_title: string;
  total_pages: number;
  pages: DocumentPage[];
}

interface DocumentViewerProps {
  documentId: string;
  highlightPage?: number;
  highlightText?: string;
  onPageClick?: (page: number) => void;
  onFullscreenToggle?: (toggleFn: () => void) => void;
  onDownload?: (downloadFn: () => void) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  className?: string;
}

export default function DocumentViewer({ 
  documentId, 
  highlightPage,
  highlightText,
  onPageClick,
  onFullscreenToggle,
  onDownload,
  searchTerm: externalSearchTerm,
  onSearchChange,
  className = "" 
}: DocumentViewerProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [documentContent, setDocumentContent] = useState<DocumentContent | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readingMode, setReadingMode] = useState(false);

  useEffect(() => {
    if (documentId) {
      fetchDocument();
      fetchDocumentContent();
    }
  }, [documentId]);

  useEffect(() => {
    if (highlightPage) {
      setCurrentPage(highlightPage);
    }
  }, [highlightPage]);

  // Expose functions to parent component
  useEffect(() => {
    if (onFullscreenToggle) {
      onFullscreenToggle(toggleFullscreen);
    }
    if (onDownload) {
      onDownload(downloadDocument);
    }
  }, [onFullscreenToggle, onDownload]);

  const fetchDocument = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const documentData = await response.json();
        setDocument(documentData);
      } else {
        toast.error("Error al cargar el documento");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocumentContent = async () => {
    if (!documentId) return;
    
    setIsLoadingContent(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}/content`, {
        credentials: 'include',
      });

      if (response.ok) {
        const contentData = await response.json();
        setDocumentContent(contentData);
      } else {
        toast.error("Error al cargar el contenido del documento");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsLoadingContent(false);
    }
  };

  const downloadDocument = async () => {
    toast.info("Función de descarga en desarrollo");
    // Implementation would depend on how documents are stored
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const nextPage = () => {
    if (documentContent && currentPage < documentContent.total_pages) {
      setCurrentPage(currentPage + 1);
      onPageClick?.(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      onPageClick?.(currentPage - 1);
    }
  };

  const goToPage = (page: number) => {
    if (documentContent && page >= 1 && page <= documentContent.total_pages) {
      setCurrentPage(page);
      onPageClick?.(page);
    }
  };

  const formatDocumentContent = (text: string, searchTerm?: string) => {
    if (!text) return null;

    // Clean up the content first
    const cleanContent = text.trim();

    // Strategy 1: Split by explicit double line breaks (most reliable for paragraph detection)
    let paragraphs = cleanContent
      .split(/\n\s*\n+/) // Split by one or more empty lines
      .filter(para => para.trim().length > 0);

    // Strategy 2: If no clear paragraph breaks, try to split by sentence patterns
    if (paragraphs.length <= 1) {
      // Split by periods followed by new line and capital letter, or multiple spaces and capital letter
      paragraphs = cleanContent
        .split(/(?<=\.)\s*\n+(?=[A-Z])|(?<=\.)\s{2,}(?=[A-Z])/) 
        .filter(para => para.trim().length > 0);
    }

    // Strategy 3: If still not working, split by common document patterns
    if (paragraphs.length <= 1) {
      // Split by common patterns like numbered lists, bullets, or long sentences
      paragraphs = cleanContent
        .split(/(?<=\.)\s+(?=\d+\.|\-|\*|[A-Z][a-z]+\s+[A-Z])/) 
        .filter(para => para.trim().length > 0);
    }

    // Strategy 4: Smart sentence grouping as last resort
    if (paragraphs.length <= 1) {
      const sentences = cleanContent
        .split(/(?<=[.!?])\s+(?=[A-Z])/)
        .filter(sentence => sentence.trim().length > 20); // Only sentences with reasonable length
      
      if (sentences.length > 2) {
        // Group sentences more intelligently based on content length
        paragraphs = [];
        let currentGroup = [];
        let currentLength = 0;
        
        for (const sentence of sentences) {
          currentGroup.push(sentence.trim());
          currentLength += sentence.length;
          
          // Create paragraph when we have 2-4 sentences or reach ~300 chars
          if (currentGroup.length >= 2 && (currentLength > 300 || currentGroup.length >= 4)) {
            paragraphs.push(currentGroup.join('. ') + (currentGroup[currentGroup.length - 1].endsWith('.') ? '' : '.'));
            currentGroup = [];
            currentLength = 0;
          }
        }
        
        // Add remaining sentences
        if (currentGroup.length > 0) {
          paragraphs.push(currentGroup.join('. ') + (currentGroup[currentGroup.length - 1].endsWith('.') ? '' : '.'));
        }
      } else {
        // Fallback: use the whole content
        paragraphs = [cleanContent];
      }
    }

    // Render paragraphs with preserved formatting
    return paragraphs.map((paragraph, index) => {
      // More careful text processing - preserve intentional line breaks within paragraphs
      const processedParagraph = paragraph
        .replace(/\n{3,}/g, '\n\n') // Reduce excessive line breaks to double
        .replace(/\n\s*\n/g, '\n\n') // Clean up line breaks with spaces
        .replace(/([^\n])\n([^\n])/g, '$1 $2') // Convert single line breaks to spaces (but preserve double breaks)
        .replace(/\s+/g, ' ') // Clean up multiple spaces
        .trim();
      
      // Split by remaining double line breaks to create sub-paragraphs if needed
      const subParagraphs = processedParagraph.split('\n\n').filter(p => p.trim());
      
      if (subParagraphs.length > 1) {
        // Multiple sub-paragraphs
        return (
          <div key={index}>
            {subParagraphs.map((subPara, subIndex) => (
              <p key={`${index}-${subIndex}`}>
                {highlightSearchText(subPara.trim(), searchTerm || '', highlightText)}
              </p>
            ))}
          </div>
        );
      } else {
        // Single paragraph
        return (
          <p key={index}>
            {highlightSearchText(processedParagraph, searchTerm || '', highlightText)}
          </p>
        );
      }
    });
  };

  const highlightSearchText = (text: string, searchTerm: string, highlightText?: string) => {
    if (!searchTerm && !highlightText) return text;
    
    const terms: string[] = [];
    if (searchTerm.trim()) terms.push(searchTerm.trim());
    if (highlightText?.trim()) terms.push(highlightText.trim());
    
    if (terms.length === 0) return text;
    
    const pattern = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    
    const parts = text.split(regex);
    return parts.map((part, index) => {
      const isHighlight = terms.some(term => part.toLowerCase() === term.toLowerCase());
      return isHighlight ? (
        <mark key={index}>{part}</mark>
      ) : (
        part
      );
    });
  };

  const getCurrentPageData = () => {
    if (!documentContent) return null;
    return documentContent.pages.find(p => p.page_number === currentPage);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Card className={cn("shadow-soft border border-[var(--border-subtle)] bg-[var(--bg-surface)]", className)}>
        <CardContent className="p-6 text-center animate-fade-in">
          <div className="relative mb-4 inline-flex">
            <div className="absolute inset-0 bg-[var(--gradient-zen-glow)] rounded-2xl blur-lg opacity-40"></div>
            <FileText className="relative h-12 w-12 text-[var(--accent-primary)] mx-auto animate-pulse" />
          </div>
          <p className="text-[var(--text-secondary)]">Cargando documento...</p>
        </CardContent>
      </Card>
    );
  }

  if (!document) {
    return (
      <Card className={cn("shadow-soft border border-[var(--border-subtle)] bg-[var(--bg-surface)]", className)}>
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Documento no encontrado
          </h3>
          <p className="text-[var(--text-muted)]">
            No se pudo cargar la información del documento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("flex gap-4", className)}>
      {/* Left Sidebar - Combined Navigation and Controls */}
      {document.status === 'indexed' && (
        <div className="w-16 flex-shrink-0 space-y-4">
          {/* Page Navigation */}
          {documentContent && documentContent.pages.length > 1 && (
            <Card className="shadow-soft border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 h-fit sticky top-2">
              <CardContent className="p-2 max-h-96 overflow-y-auto">
                <div className="space-y-1">
                  {documentContent.pages.map((page) => (
                    <div
                      key={page.page_number}
                      className={cn(
                        "flex items-center justify-center w-12 h-8 rounded-md cursor-pointer transition-all text-xs font-medium border",
                        currentPage === page.page_number
                          ? "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-soft"
                          : "text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-muted)]/70"
                      )}
                      onClick={() => goToPage(page.page_number)}
                      title={`Página ${page.page_number}`}
                    >
                      {page.page_number}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Controls Card */}
          <Card className="shadow-soft border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 h-fit sticky top-2">
            <CardContent className="p-2">
              <div className="space-y-2">
                {/* Page Navigation */}
                {[
                  {
                    icon: ChevronLeft,
                    action: prevPage,
                    disabled: currentPage === 1,
                    title: "Página anterior",
                  },
                  {
                    icon: ChevronRight,
                    action: nextPage,
                    disabled: currentPage === (documentContent?.total_pages || 0),
                    title: "Página siguiente",
                  },
                  {
                    icon: ZoomOut,
                    action: () => setZoom(Math.max(0.5, zoom - 0.1)),
                    disabled: zoom <= 0.5,
                    title: "Alejar",
                  },
                  {
                    icon: ZoomIn,
                    action: () => setZoom(Math.min(3, zoom + 0.1)),
                    disabled: zoom >= 3,
                    title: "Acercar",
                  },
                ].map((control, idx) => (
                  <Button
                    key={control.title}
                    variant="outline"
                    size="sm"
                    onClick={control.action}
                    disabled={control.disabled}
                    className="w-9 h-9 p-0 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]/80"
                    title={control.title}
                  >
                    <control.icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
                
                <Button
                  variant={readingMode ? "gradient" : "outline"}
                  size="sm"
                  onClick={() => setReadingMode(!readingMode)}
                  className={readingMode ? "w-9 h-9 p-0 text-white" : "w-9 h-9 p-0 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]/80"}
                  title={readingMode ? "Modo Normal" : "Modo Lectura"}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1">

        {/* Document Viewer */}
        {document.status === 'indexed' && (
          <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background p-6 overflow-auto' : ''}`}>
            {/* Document Content - Directly visible */}
            <Card className="shadow-soft border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <CardContent className="p-0">
                {isLoadingContent ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 text-primary mx-auto mb-4 animate-spin" />
                    <p className="text-muted-foreground">Cargando contenido del documento...</p>
                  </div>
                ) : (
                  <div className="min-h-96">
                    {getCurrentPageData() ? (
                      <div className="relative">
                        {/* Page Header */}
                        <div className="bg-[var(--bg-muted)] px-6 py-3 border-b border-[var(--border-subtle)]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <span className="text-sm font-medium text-muted-foreground">
                                Página {currentPage} de {documentContent?.total_pages}
                              </span>
                              <Badge variant="outline" className="border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/10">
                                {getCurrentPageData()?.chunks.reduce((total, chunk) => total + chunk.tokens, 0)} tokens
                              </Badge>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">
                                Zoom: {Math.round(zoom * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Document Paper */}
                        <div className={`${readingMode ? 'bg-[var(--bg-muted)]' : 'bg-[var(--bg-muted)]/50'} p-6 min-h-[600px]`}>
                          <div 
                            className={`bg-[var(--bg-card)] text-[var(--text-primary)] mx-auto transition-all duration-200 ${
                              readingMode 
                                ? 'shadow-2xl border border-[var(--border-subtle)]'
                                : `${styles.paperShadow} ${styles.paperTexture} rounded-lg`
                            }`}
                            style={{ 
                              transform: `scale(${zoom})`,
                              transformOrigin: 'top center',
                              maxWidth: readingMode ? '700px' : '8.5in',  // Wider for reading mode
                              minHeight: readingMode ? 'auto' : '11in',   // Auto height for reading
                              padding: readingMode ? '3rem 2.5rem' : '1in',
                              borderRadius: readingMode ? '8px' : undefined,
                            }}
                          >
                            <div className={styles.documentContent} style={{
                              fontSize: readingMode ? '18px' : undefined,
                              lineHeight: readingMode ? '1.8' : undefined,
                            }}>
                              {formatDocumentContent(getCurrentPageData()?.full_text || '', externalSearchTerm)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No hay contenido disponible para esta página</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Status Help */}
        {document.status !== 'indexed' && (
          <Card className="shadow-card border-orange-600/20">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-orange-900/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <ExternalLink className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-medium text-orange-400 mb-1">
                    Documento en proceso
                  </h4>
                  <p className="text-sm text-gray-400">
                    {document.status === 'processing' 
                      ? 'Este documento se está procesando. Una vez completado, podrás chatear con él.'
                      : document.status === 'pending'
                      ? 'Este documento está esperando ser procesado.'
                      : 'Hubo un error procesando este documento.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
