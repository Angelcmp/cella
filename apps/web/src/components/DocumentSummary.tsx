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

  const loadSummary = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}/summary`, {
        credentials: 'include',
      });

      if (response.ok) {
        const summaryData = await response.json();
        setSummary(summaryData);
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
        setSummary(summaryData);
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
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg blur-sm opacity-30"></div>
              <Sparkles className="relative h-5 w-5 text-purple-400" />
            </div>
            <CardTitle className="text-sm font-medium text-gray-300">
              Resumen IA
            </CardTitle>
          </div>
          
          <div className="flex items-center space-x-2">
            {summary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-400 hover:text-gray-100 h-6 w-6 p-0"
              >
                {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={generateSummary}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-100 h-6 w-6 p-0"
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
            <div className="text-gray-400 text-sm mb-3">
              Genera un resumen inteligente del documento
            </div>
            <Button
              onClick={generateSummary}
              disabled={isLoading}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90 text-white"
            >
              <Sparkles className="h-3 w-3 mr-2" />
              Generar resumen
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center space-x-2 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Generando resumen inteligente...</span>
            </div>
          </div>
        )}

        {hasError && (
          <div className="text-center py-4">
            <div className="text-red-400 text-sm mb-3">
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
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <span>Generado {formatDate(summary.generatedAt)}</span>
              {summary.pageCount && (
                <Badge variant="outline" className="text-xs">
                  {summary.pageCount} páginas
                </Badge>
              )}
              {summary.wordCount && (
                <Badge variant="outline" className="text-xs">
                  ~{summary.wordCount} palabras
                </Badge>
              )}
            </div>

            {/* Summary Preview */}
            <div className="text-sm text-gray-300 leading-relaxed">
              {isExpanded ? summary.summary : `${summary.summary.substring(0, 150)}${summary.summary.length > 150 ? '...' : ''}`}
            </div>

            {summary.summary.length > 150 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-purple-400 hover:text-purple-300 text-xs p-0"
              >
                {isExpanded ? 'Ver menos' : 'Ver más'}
              </Button>
            )}

            {isExpanded && (
              <div className="space-y-4 animate-fade-in">
                {/* Key Points */}
                {summary.keyPoints && summary.keyPoints.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 mb-2">Puntos clave:</h4>
                    <ul className="space-y-1 text-xs text-gray-300">
                      {summary.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-purple-400 mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Topics */}
                {summary.topics && summary.topics.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 mb-2">Temas principales:</h4>
                    <div className="flex flex-wrap gap-1">
                      {summary.topics.map((topic, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs border-purple-600 text-purple-400"
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
