import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Sparkles, 
  Loader2, 
  RefreshCw,
  Eye,
  EyeOff 
} from 'lucide-react';
import { toast } from 'sonner';

interface DocumentSummaryProps {
  documentId: string;
  documentTitle: string;
  className?: string;
}

interface SummaryData {
  summary: string;
  keyPoints: string[];
  topics: string[];
  pageCount?: number;
  wordCount?: number;
  generatedAt: string;
}

export function DocumentSummary({ documentId, documentTitle, className = "" }: DocumentSummaryProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Check if we have a cached summary
    loadSummary();
  }, [documentId]);

  const normalize = (raw: any): SummaryData => ({
    summary: raw.summary || raw.executive_summary || "",
    keyPoints: raw.keyPoints || raw.key_points || [],
    topics: raw.topics || raw.mainTopics || raw.main_topics || [],
    pageCount: raw.pageCount ?? raw.page_count,
    wordCount: raw.wordCount ?? raw.word_count,
    generatedAt: raw.generatedAt || raw.created_at || new Date().toISOString(),
  });

  const loadSummary = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}/summary`, {
        credentials: 'include',
      });

      if (response.ok) {
        const summaryData = await response.json();
        setSummary(normalize(summaryData));
        setHasError(false);
      } else if (response.status === 404) {
        // No summary exists yet - this is normal
        setHasError(false);
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error("Error loading summary:", error);
      setHasError(true);
    }
  };

  const generateSummary = async () => {
    setIsLoading(true);
    setHasError(false);
    
    try {
      const token = (document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)?.[1]) || '';
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}/summary`, {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
          ...(token ? { 'x-csrf-token': decodeURIComponent(token) } : {}),
        },
      });

      if (response.ok) {
        const summaryData = await response.json();
        setSummary(normalize(summaryData));
        toast.success("Resumen generado exitosamente");
      } else {
        const error = await response.json();
        toast.error(error.detail || "Error al generar resumen");
        setHasError(true);
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error("Error de conexión al generar resumen");
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={`shadow-card transition-all duration-300 hover:shadow-lg ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="absolute inset-0 bg-[var(--primary-container)] rounded-lg blur-sm opacity-30"></div>
              <Sparkles className="relative h-5 w-5 text-[var(--primary-fixed)]" />
            </div>
            <CardTitle className="font-label-mono text-(length:--zen-fs-heading) font-medium text-[var(--on-surface)]">
              Resumen IA
            </CardTitle>
          </div>
          
          <div className="flex items-center space-x-2">
            {summary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] h-6 w-6 p-0"
              >
                {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={generateSummary}
              disabled={isLoading}
              className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] h-6 w-6 p-0"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {!summary && !isLoading && !hasError && (
          <div className="text-center py-4">
            <div className="text-(length:--zen-fs-body) text-[var(--on-surface-variant)]/60 mb-3">
              Genera un resumen inteligente del documento
            </div>
            <Button
              onClick={generateSummary}
              disabled={isLoading}
              size="sm"
              className="bg-[var(--primary-fixed)] hover:opacity-90 text-white"
            >
              <Sparkles className="h-3 w-3 mr-2" />
              Generar resumen
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center space-x-2 text-[var(--on-surface-variant)]/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-(length:--zen-fs-body)">Generando resumen inteligente...</span>
            </div>
          </div>
        )}

        {hasError && (
          <div className="text-center py-4">
            <div className="text-red-400 text-(length:--zen-fs-body) mb-3">
              Error al cargar/generar resumen
            </div>
            <Button
              onClick={generateSummary}
              size="sm"
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-900/20"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Reintentar
            </Button>
          </div>
        )}

        {summary && (
          <div className="space-y-4 animate-fade-in">
            {/* Quick Stats */}
            <div className="flex items-center space-x-3 text-(length:--zen-fs-label) text-[var(--on-surface-variant)]/60">
              <span className="font-label-mono">Generado {formatDate(summary.generatedAt)}</span>
              {summary.pageCount && (
                <Badge variant="outline" className="font-label-mono text-(length:--zen-fs-label)">
                  {summary.pageCount} páginas
                </Badge>
              )}
              {summary.wordCount && (
                <Badge variant="outline" className="font-label-mono text-(length:--zen-fs-label)">
                  ~{summary.wordCount} palabras
                </Badge>
              )}
            </div>

            {/* Summary Preview */}
            <div className="text-(length:--zen-fs-body) text-[var(--on-surface-variant)] leading-relaxed">
              {isExpanded ? summary.summary : `${summary.summary.substring(0, 150)}${summary.summary.length > 150 ? '...' : ''}`}
            </div>

            {summary.summary.length > 150 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="font-label-mono text-[var(--primary-fixed)] hover:text-[var(--primary-fixed)] text-(length:--zen-fs-label) p-0"
              >
                {isExpanded ? 'Ver menos' : 'Ver más'}
              </Button>
            )}

            {isExpanded && (
              <div className="space-y-4 animate-fade-in">
                {/* Key Points */}
                {summary.keyPoints && summary.keyPoints.length > 0 && (
                  <div>
                    <h4 className="font-label-mono text-(length:--zen-fs-secondary) font-medium text-[var(--on-surface-variant)] mb-2">Puntos clave:</h4>
                    <ul className="space-y-1 text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)]">
                      {summary.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-[var(--primary-fixed)] mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Topics */}
                {summary.topics && summary.topics.length > 0 && (
                  <div>
                    <h4 className="font-label-mono text-(length:--zen-fs-secondary) font-medium text-[var(--on-surface-variant)] mb-2">Temas principales:</h4>
                    <div className="flex flex-wrap gap-1">
                      {summary.topics.map((topic, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="font-label-mono text-(length:--zen-fs-secondary) border-0 text-[var(--primary-fixed)] whitespace-normal break-words text-left max-w-full shrink px-2 py-1"
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
