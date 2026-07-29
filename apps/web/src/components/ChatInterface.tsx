"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import ExportDialog from "./ExportDialog";
import ChatInput from "./zen/ChatInput";
import { withCsrfHeaders } from "@/lib/csrf";
import { cn } from "@/lib/utils";
import type { ModelId } from "./zen/store";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

interface Citation {
  page: number;
  snippet: string;
  similarity?: number;
}

interface ChatInterfaceProps {
  documentId: string;
  documentTitle: string;
  model?: ModelId;
  onCitationClick?: (page: number) => void;
  onUploadClick?: () => void;
  className?: string;
}

export default function ChatInterface({ 
  documentId, 
  documentTitle,
  model,
  onCitationClick,
  onUploadClick,
  className = "" 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to format message content with paragraphs, inline styles and code blocks
  const formatMessageContent = (content: string) => {
    if (!content) return null;

    // Clean up the content first
    const cleanContent = content.trim();

    // Helper: render inline rich text (bold **...**, italic *...*, and code `...`)
    const renderInlineRich = (text: string) => {
      const nodes: (string | JSX.Element)[] = [];
      // First split by code spans using backticks
      const codeSplit = text.split(/(`[^`]+`)/g);
      codeSplit.forEach((segment, i) => {
        if (segment.startsWith('`') && segment.endsWith('`')) {
          const codeText = segment.slice(1, -1);
          nodes.push(
            <code
              key={`code-${i}`}
              className="bg-muted text-foreground/90 px-1.5 py-0.5 rounded font-mono text-[0.9em]"
            >
              {codeText}
            </code>
          );
        } else if (segment) {
          // Then split bold **...** within non-code segments
          const boldSplit = segment.split(/(\*\*[^*]+\*\*)/g);
          boldSplit.forEach((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              const boldText = part.slice(2, -2);
              nodes.push(
                <strong key={`bold-${i}-${j}`} className="font-semibold text-primary">
                  {boldText}
                </strong>
              );
            } else if (part) {
              // Finally split italics *...* (avoid matching **bold**)
              const italicSplit = part.split(/(?<!\*)\*([^*]+)\*(?!\*)/g);
              italicSplit.forEach((sub, k) => {
                if (k % 2 === 1) {
                  nodes.push(
                    <em key={`italic-${i}-${j}-${k}`} className="italic text-foreground">
                      {sub}
                    </em>
                  );
                } else if (sub) {
                  nodes.push(sub);
                }
              });
            }
          });
        }
      });
      return nodes;
    };

    // Split into blocks by triple backticks for code blocks
    const blocks: JSX.Element[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(cleanContent)) !== null) {
      const [full, lang, code] = match;
      const start = match.index;
      if (start > lastIndex) {
        const textSegment = cleanContent.slice(lastIndex, start);
        blocks.push(...renderTextSegment(textSegment, blockIndex++));
      }
      blocks.push(
        <pre
          key={`pre-${blockIndex++}`}
          className="bg-muted text-foreground border border-border rounded-md p-3 my-3 overflow-x-auto text-sm"
        >
          <code className="font-mono whitespace-pre">{code}</code>
        </pre>
      );
      lastIndex = start + full.length;
    }
    if (lastIndex < cleanContent.length) {
      const textSegment = cleanContent.slice(lastIndex);
      blocks.push(...renderTextSegment(textSegment, blockIndex++));
    }

    return blocks;

    // Render text segment into paragraphs
    function renderTextSegment(text: string, seedKey: number) {
      // Strategy 1: Split by explicit double line breaks (most reliable for paragraph detection)
      let paragraphs = text
        .split(/\n\s*\n+/)
        .filter(para => para.trim().length > 0);

      // Strategy 2: If no clear paragraph breaks, split by sentence endings with citations
      if (paragraphs.length <= 1) {
        paragraphs = text
          .split(/(?<=\.)\s+(?=\([^)]*página[^)]*\)|[A-Z][a-z]+[^.]*(?:según|además|por|el|la|este|esta|finalmente|también|asimismo))/)
          .filter(para => para.trim().length > 0);
      }

      // Strategy 3: Enhanced sentence splitting for better paragraph formation
      if (paragraphs.length <= 1) {
        const sentences = text
          .split(/(?<=[.!?])\s+(?=[A-Z])(?![A-Z]{2,}\b)(?!Dr\.|Sr\.|Sra\.|Prof\.)/)
          .filter(sentence => sentence.trim().length > 10);
        if (sentences.length >= 2) {
          paragraphs = sentences.map(sentence => sentence.trim());
        } else {
          paragraphs = [text];
        }
      }

      if (paragraphs.length === 1 && paragraphs[0].length > 300) {
        const longParagraph = paragraphs[0];
        paragraphs = longParagraph
          .split(/(?<=\.)\s+(?=Además,|Asimismo,|Por otro lado,|Sin embargo,|No obstante,|Finalmente,|En resumen,|Por tanto,|En consecuencia,)/)
          .filter(para => para.trim().length > 0);
      }

      return paragraphs.map((paragraph, idx) => {
        const cleanParagraph = paragraph.replace(/\s+/g, ' ').trim();
        // Detect blockquote (lines starting with '>')
        if (/^\s*>\s*/m.test(paragraph)) {
          const lines = paragraph.split(/\n+/).map(l => l.replace(/^\s*>\s*/, '').trim()).filter(Boolean);
          return (
            <blockquote key={`${seedKey}-q-${idx}`} className="border-l-4 border-border pl-3 py-1 my-2 text-muted-foreground italic">
              {lines.map((l, i2) => (
                <p key={`${seedKey}-q-${idx}-${i2}`} className="mb-1 last:mb-0">
                  {renderInlineRich(l)}
                </p>
              ))}
            </blockquote>
          );
        }

        // Detect list (unordered or ordered)
        const listLines = paragraph.split(/\n+/);
        const ulItems = listLines.filter(l => /^\s*(?:[-*•])\s+/.test(l));
        const olItems = listLines.filter(l => /^\s*\d+\.\s+/.test(l));
        if (ulItems.length >= 2) {
          return (
            <ul key={`${seedKey}-ul-${idx}`} className="list-disc pl-5 my-2 space-y-1">
              {ulItems.map((l, i3) => (
                <li key={`${seedKey}-uli-${idx}-${i3}`} className="text-sm md:text-base leading-5 md:leading-relaxed">
                  {renderInlineRich(l.replace(/^\s*(?:[-*•])\s+/, ''))}
                </li>
              ))}
            </ul>
          );
        }
        if (olItems.length >= 2) {
          return (
            <ol key={`${seedKey}-ol-${idx}`} className="list-decimal pl-5 my-2 space-y-1">
              {olItems.map((l, i4) => (
                <li key={`${seedKey}-oli-${idx}-${i4}`} className="text-sm md:text-base leading-5 md:leading-relaxed">
                  {renderInlineRich(l.replace(/^\s*\d+\.\s+/, ''))}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`${seedKey}-p-${idx}`} className="mb-1 md:mb-2 text-sm md:text-base leading-5 md:leading-relaxed">
            {renderInlineRich(cleanParagraph)}
          </p>
        );
      });
    }
  };

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `¡Hola! Estoy listo para responder preguntas sobre "${documentTitle}". Puedo ayudarte a encontrar información específica y proporcionarte citas exactas. ¿En qué puedo ayudarte?`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [documentTitle]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (text: string) => {

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/chat/documents/${documentId}`,
        withCsrfHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify({
            message: userMessage.content,
            model: model || "deepseek-v4-flash",
          }),
        })
      );

      if (response.ok) {
        const chatResponse = await response.json();
        console.log("📨 Full chat response:", chatResponse);
        
        // Store conversation ID for export functionality
        if (chatResponse.conversation_id && !conversationId) {
          console.log("🔄 Setting conversation ID:", chatResponse.conversation_id);
          setConversationId(chatResponse.conversation_id);
        } else {
          console.log("❌ No conversation_id in response or already set:", {
            has_conversation_id: !!chatResponse.conversation_id,
            current_conversationId: conversationId,
            response_conversation_id: chatResponse.conversation_id
          });
        }
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: chatResponse.response,
          citations: chatResponse.citations.map((citation: { page: number; snippet: string; similarity?: number }) => ({
            page: citation.page,
            snippet: citation.snippet,
            similarity: citation.similarity
          })),
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        if (!chatResponse.success && chatResponse.error) {
          toast.error(chatResponse.error);
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || "Error al procesar el mensaje");
      }
    } catch (error) {
      toast.error("Error de conexión al enviar el mensaje");
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      } else {
        throw new Error("Clipboard API no disponible");
      }
      toast.success("Mensaje copiado al portapapeles");
    } catch (err) {
      console.error("Clipboard copy failed", err);
      toast.error("No se pudo copiar el texto");
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-[var(--bg-primary)]", className)}>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "group",
              message.role === "user"
                ? "flex justify-end"
                : "flex justify-start"
            )}
          >
            <div className={cn(
              "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              message.role === "user"
                ? "bg-[var(--bg-muted)] text-[var(--text-primary)]"
                : "text-[var(--text-primary)]"
            )}>
              <div className="break-words">
                {formatMessageContent(message.content)}
              </div>

              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-1.5">
                  {message.citations.map((citation, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-[11px] cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onCitationClick?.(citation.page)}
                    >
                      <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded-md bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[10px] font-medium">
                        p.{citation.page}
                      </span>
                      <span className="text-[var(--text-secondary)] italic leading-snug">
                        &ldquo;{citation.snippet}&rdquo;
                      </span>
                      {citation.similarity && (
                        <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                          {Math.round(citation.similarity * 100)}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => copyToClipboard(message.content)}
                  className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 flex items-center gap-2 text-[var(--text-muted)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-sm">Generando respuesta...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput
        onSend={(message) => {
          handleSendMessage(message);
        }}
        onUpload={() => onUploadClick?.()}
        isLoading={isLoading}
      />
    </div>
  );
}
