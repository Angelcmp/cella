import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onActionClick?: () => void;
  secondaryActionText?: string;
  onSecondaryActionClick?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onActionClick,
  secondaryActionText,
  onSecondaryActionClick,
  className = ""
}: EmptyStateProps) {
  return (
    <Card className={`shadow-card max-w-2xl mx-auto animate-fade-in ${className}`}>
      <CardContent className="p-12 text-center">
        {/* Animated Icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-lg blur-md opacity-30 animate-pulse-soft"></div>
          <div className="relative bg-gray-800/50 p-6 rounded-lg backdrop-blur-sm">
            <Icon className="h-16 w-16 mx-auto text-gray-400 animate-bounce-subtle" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-8">
          <h3 className="text-2xl font-bold text-gray-100 animate-fade-in" style={{animationDelay: '0.2s'}}>
            {title}
          </h3>
          <p className="text-gray-400 text-lg leading-relaxed max-w-md mx-auto animate-fade-in" style={{animationDelay: '0.4s'}}>
            {description}
          </p>
        </div>

        {/* Actions */}
        {(actionText || secondaryActionText) && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{animationDelay: '0.6s'}}>
            {actionText && onActionClick && (
              <Button 
                onClick={onActionClick}
                className="bg-gradient-gold hover:opacity-90 text-white transition-all duration-300 hover:scale-105 active:scale-95"
              >
                {actionText}
              </Button>
            )}
            {secondaryActionText && onSecondaryActionClick && (
              <Button 
                variant="outline" 
                onClick={onSecondaryActionClick}
                className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/20 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                {secondaryActionText}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Icon component for no documents
function NoDocumentsIcon() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-lg blur-md opacity-40"></div>
      <svg className="relative h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  );
}

// Specialized empty states
export function NoDocumentsEmpty({ onUpload, onViewDocs }: { onUpload?: () => void; onViewDocs?: () => void }) {
  return (
    <EmptyState
      icon={NoDocumentsIcon}
      title="Comienza tu viaje con DocAI"
      description="Sube tu primer documento y descubre el poder del análisis inteligente con IA. Transforma cualquier archivo en una conversación."
      actionText="Subir mi primer documento"
      onActionClick={onUpload}
      secondaryActionText="Explorar características"
      onSecondaryActionClick={onViewDocs}
    />
  );
}

// Icon component for no chat documents
function NoChatDocumentsIcon() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-500 rounded-lg blur-md opacity-40"></div>
      <svg className="relative h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    </div>
  );
}

export function NoChatDocumentsEmpty({ onUpload, onViewDocs }: { onUpload?: () => void; onViewDocs?: () => void }) {
  return (
    <EmptyState
      icon={NoChatDocumentsIcon}
      title="No hay documentos listos para chat"
      description="Para conversar con tus documentos, primero necesitan ser procesados e indexados por nuestro sistema de IA."
      actionText="Subir documento"
      onActionClick={onUpload}
      secondaryActionText="Ver mis documentos"
      onSecondaryActionClick={onViewDocs}
    />
  );
}

export function LoadingEmpty({ message = "Cargando..." }: { message?: string }) {
  return (
    <Card className="shadow-card max-w-2xl mx-auto animate-fade-in">
      <CardContent className="p-12 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-lg blur-md opacity-40 animate-pulse"></div>
          <div className="relative bg-gray-800/50 p-6 rounded-lg backdrop-blur-sm">
            <svg className="h-16 w-16 mx-auto text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
        <p className="text-gray-300 text-lg">{message}</p>
      </CardContent>
    </Card>
  );
}