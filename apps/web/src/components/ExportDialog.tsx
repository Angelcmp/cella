"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Loader2, 
  CheckCircle,
  XCircle,
  FileDown
} from "lucide-react";
import { toast } from "sonner";
import { withCsrfHeaders } from "@/lib/csrf";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  documentTitle: string;
}

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  extension: string;
}

const exportFormats: ExportFormat[] = [
  {
    id: "pdf",
    name: "PDF",
    description: "Documento profesional con formato y estilos",
    icon: FileText,
    extension: ".pdf"
  },
  {
    id: "docx",
    name: "Word",
    description: "Documento editable compatible con Microsoft Word",
    icon: FileDown,
    extension: ".docx"
  },
  {
    id: "txt",
    name: "Texto Plano",
    description: "Formato simple compatible universalmente",
    icon: FileText,
    extension: ".txt"
  }
];

export default function ExportDialog({ 
  isOpen, 
  onClose, 
  conversationId, 
  documentTitle 
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>("pdf");
  const [includeCitations, setIncludeCitations] = useState<boolean>(true);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = async () => {
    if (!selectedFormat) {
      toast.error("Selecciona un formato de exportación");
      return;
    }

    setIsExporting(true);
    setExportStatus('idle');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/exports/conversations/export`,
        withCsrfHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify({
            conversation_id: conversationId,
            export_type: selectedFormat,
            include_citations: includeCitations,
            title: customTitle || undefined
          }),
        })
      );

      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          setExportStatus('success');
          
          // Start download
          const downloadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${result.download_url}`, {
            method: "GET",
            credentials: 'include',
          });
          
          if (downloadResponse.ok) {
            const blob = await downloadResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success(`Conversación exportada como ${result.filename}`);
            
            // Close dialog after successful export
            setTimeout(() => {
              onClose();
              setExportStatus('idle');
            }, 1500);
          } else {
            throw new Error("Error al descargar el archivo");
          }
        } else {
          throw new Error(result.error || "Error al exportar la conversación");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al exportar la conversación");
      }
    } catch (error) {
      console.error("Export error:", error);
      setExportStatus('error');
      toast.error(error instanceof Error ? error.message : "Error de conexión al exportar");
    } finally {
      setIsExporting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800 text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5 text-blue-400" />
            <span>Exportar Conversación</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Document Info */}
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <p className="text-sm text-gray-400 mb-1">Documento:</p>
            <p className="text-sm font-medium text-gray-100">{documentTitle}</p>
          </div>

          {/* Custom Title */}
          <div className="space-y-2">
            <Label htmlFor="custom-title" className="text-sm font-medium">
              Título personalizado (opcional)
            </Label>
            <Input
              id="custom-title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Deja vacío para usar título automático"
              className="bg-gray-800 border-gray-700 text-gray-100"
            />
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Formato de exportación</Label>
            <div className="grid gap-3">
              {exportFormats.map((format) => {
                const IconComponent = format.icon;
                const isSelected = selectedFormat === format.id;
                
                return (
                  <div
                    key={format.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? "border-blue-500 bg-blue-500/10" 
                        : "border-gray-700 bg-gray-800/30 hover:border-gray-600"
                    }`}
                    onClick={() => setSelectedFormat(format.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <IconComponent className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{format.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {format.extension}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {format.description}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-blue-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Opciones</Label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include-citations"
                checked={includeCitations}
                onChange={(e) => setIncludeCitations(e.target.checked)}
                className="rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500"
              />
              <Label htmlFor="include-citations" className="text-sm text-gray-300">
                Incluir citas del documento
              </Label>
            </div>
          </div>

          {/* Export Status */}
          {exportStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-400 bg-green-400/10 p-3 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">¡Exportación completada exitosamente!</span>
            </div>
          )}

          {exportStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-400 bg-red-400/10 p-3 rounded-lg">
              <XCircle className="h-5 w-5" />
              <span className="text-sm">Error al exportar la conversación</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-800">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || !selectedFormat}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
