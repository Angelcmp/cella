"use client";

import React, { useState, useEffect, useRef, type ReactElement, useCallback } from "react";
import { toast } from "sonner";
import { Copy, FileText, Braces, ChevronDown, ChevronUp } from "lucide-react";
import ChatInput from "./zen/ChatInput";
import ThinkingBlock from "./zen/ThinkingBlock";
import { withCsrfHeaders } from "@/lib/csrf";
import { cn } from "@/lib/utils";
import type { ModelId } from "./zen/store";
import { useZenStore } from "./zen/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
  thinking?: string;
  thinkingStartedAt?: number;
  thinkingDone?: boolean;
}

interface Citation {
  page: number;
  snippet: string;
  similarity?: number;
  document?: string;
}

interface ChatInterfaceProps {
  documentId: string;
  documentTitle: string;
  documentIds?: string[];
  model?: ModelId;
  conversationId?: string;
  onCitationClick?: (page: number) => void;
  onUploadClick?: () => void;
  className?: string;
}

export default function ChatInterface({ 
  documentId, 
  documentTitle,
  documentIds,
  model,
  conversationId,
  onCitationClick,
  onUploadClick,
  className = "" 
}: ChatInterfaceProps) {
  const isMulti = Array.isArray(documentIds) && documentIds.length > 1;
  const effectiveDocumentIds = isMulti ? documentIds : [documentId];
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backendConversationId, setBackendConversationId] = useState<string | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const zenStoreActiveDoc = useZenStore((s) => s.activeDocumentId);
  const activeConversationId = useZenStore((s) => s.activeConversationId);
  const addConversation = useZenStore((s) => s.addConversation);
  const setActiveConversation = useZenStore((s) => s.setActiveConversation);
  const updateConversation = useZenStore((s) => s.updateConversation);

  // Fetch messages when conversationId prop changes (only for externally loaded conversations)
  useEffect(() => {
    if (!conversationId || conversationId === backendConversationId) return;
    setMessages([]);
    fetch(`${API_URL}/conversations/${conversationId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.messages) return;
        const msgs: Message[] = data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations,
          timestamp: new Date(m.created_at || Date.now()),
        }));
        setMessages(msgs);
        setBackendConversationId(data.id);
      })
      .catch(() => {});
  }, [conversationId, backendConversationId]);

  const registerConversationInStore = useCallback(
    (text: string) => {
      if (!zenStoreActiveDoc || activeConversationId) return;
      const title = text.slice(0, 40) + (text.length > 40 ? "…" : "");
      const convId = crypto.randomUUID();
      const state = useZenStore.getState();
      state.addConversation({
        id: convId,
        title,
        pinned: false,
        projectId: state.activeProjectId,
        documentId: zenStoreActiveDoc,
        documentIds: isMulti ? effectiveDocumentIds : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      state.setActiveConversation(convId);
    },
    [zenStoreActiveDoc, activeConversationId, isMulti, effectiveDocumentIds, addConversation, setActiveConversation]
  );

  const syncBackendId = useCallback(
    (conversation_id: string) => {
      const state = useZenStore.getState();
      const active = state.conversations.find((c) => c.id === state.activeConversationId);
      if (active && !active.backendId) {
        updateConversation(active.id, { backendId: conversation_id, updatedAt: new Date().toISOString() });
      }
      setBackendConversationId(conversation_id);
    },
    [updateConversation]
  );

  const toggleCitations = (msgId: string) => {
    setExpandedCitations((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const quickPrompts = [
    "¿Cuál es la idea principal del documento?",
    "Resume el documento en 3 puntos clave",
    "Explícame los conceptos más importantes",
    "¿Qué conclusiones puedo extraer?",
  ];

  // Function to format message content with paragraphs, inline styles and code blocks
  const formatMessageContent = (content: string) => {
    if (!content) return null;

    // Clean up the content first
    const cleanContent = content
      .replace(/\n*Citas?:\s*\[Página\s+\d+\](?:\s*:?\s*"[^"]*")?(\s*\[Página\s+\d+\](?:\s*:?\s*"[^"]*")?)*\s*$/gi, '')
      .trim();

    // Helper: render inline rich text (bold **...**, italic *...*, code `...`, page refs)
    const renderInlineRich = (text: string) => {
      // Step 0: detect page references (Página X) and render as styled badges
      const pageRefRegex = /(\(Páginas?\s+\d+(?:\s*,\s*\d+)*(?:\s+y\s+\d+)?\))/gi;
      const segments = text.split(pageRefRegex);
      return segments.map((segment, si) => {
        const match = segment.match(/^\(Páginas?\s+\d+/i);
        if (match) {
          const clean = segment.slice(1, -1);
          return (
            <span key={`pg-${si}`} className="inline-block px-1.5 py-px rounded bg-[var(--primary-fixed)]/8 text-[var(--primary-fixed)] font-label-mono text-(length:--zen-fs-label) font-medium">
              {clean}
            </span>
          );
        }
        // Tokenize segment for bold, italic, code
        const segments2: (string | ReactElement)[] = [];
        const codeSplit = segment.split(/(`[^`]+`)/g);
        codeSplit.forEach((codeSeg, ci) => {
          if (codeSeg.startsWith('`') && codeSeg.endsWith('`')) {
            segments2.push(
              <code key={`c-${si}-${ci}`} className="bg-muted text-foreground/90 px-1.5 py-0.5 rounded font-mono text-[0.9em]">
                {codeSeg.slice(1, -1)}
              </code>
            );
          } else if (codeSeg) {
            const boldSplit = codeSeg.split(/(\*\*[^*]+\*\*)/g);
            boldSplit.forEach((boldPart, bj) => {
              if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
                segments2.push(
                  <strong key={`b-${si}-${ci}-${bj}`} className="font-semibold zen-read-text">
                    {boldPart.slice(2, -2)}
                  </strong>
                );
              } else if (boldPart) {
                const italicSplit = boldPart.split(/(?<!\*)\*([^*]+)\*(?!\*)/g);
                italicSplit.forEach((italicSub, ik) => {
                  if (ik % 2 === 1) {
                    segments2.push(
                      <em key={`i-${si}-${ci}-${bj}-${ik}`} className="italic zen-read-text">
                        {italicSub}
                      </em>
                    );
                  } else if (italicSub) {
                    segments2.push(italicSub);
                  }
                });
              }
            });
          }
        });
        return (
          <React.Fragment key={`frag-${si}`}>{segments2}</React.Fragment>
        );
      });
    };

    // Split into blocks by triple backticks for code blocks
    const blocks: ReactElement[] = [];
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

        // Detect heading (starts with 1-6 # characters)
        const headingMatch = paragraph.match(/^\s*(#{1,6})\s+(.+?)\s*$/m);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const headingClasses = "font-zen-heading zen-text-heading font-semibold zen-read-text mt-3 mb-1.5 leading-tight";
          const headingContent = renderInlineRich(headingMatch[2].trim());
          if (level === 1) return <h1 key={`${seedKey}-h-${idx}`} className={headingClasses}>{headingContent}</h1>;
          if (level === 2) return <h2 key={`${seedKey}-h-${idx}`} className={headingClasses}>{headingContent}</h2>;
          if (level === 3) return <h3 key={`${seedKey}-h-${idx}`} className={headingClasses}>{headingContent}</h3>;
          if (level === 4) return <h4 key={`${seedKey}-h-${idx}`} className={headingClasses}>{headingContent}</h4>;
          if (level === 5) return <h5 key={`${seedKey}-h-${idx}`} className={headingClasses}>{headingContent}</h5>;
          return <h6 key={`${seedKey}-h-${idx}`} className={headingClasses}>{headingContent}</h6>;
        }

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
                <li key={`${seedKey}-uli-${idx}-${i3}`} className="zen-text-body leading-relaxed zen-read-text">
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
                <li key={`${seedKey}-oli-${idx}-${i4}`} className="zen-text-body leading-relaxed zen-read-text">
                  {renderInlineRich(l.replace(/^\s*\d+\.\s+/, ''))}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`${seedKey}-p-${idx}`} className="mb-2 zen-text-body leading-relaxed zen-read-text">
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
      content: isMulti
        ? `¡Hola! Estoy listo para responder preguntas sobre ${effectiveDocumentIds.length} documentos. Puedo buscar información en todos ellos y citar la fuente de cada respuesta. ¿En qué puedo ayudarte?`
        : `¡Hola! Estoy listo para responder preguntas sobre "${documentTitle}". Puedo ayudarte a encontrar información específica y proporcionarte citas exactas. ¿En qué puedo ayudarte?`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [documentTitle, effectiveDocumentIds.length, isMulti]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const streamControllerRef = useRef<AbortController | null>(null);

  const stopStreaming = () => {
    streamControllerRef.current?.abort();
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

    // Register conversation in sidebar store if this is the first message
    registerConversationInStore(text);

    const controller = new AbortController();
    streamControllerRef.current = controller;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/chat/documents/${documentId}`,
        withCsrfHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify({
            message: userMessage.content,
            model: model || undefined,
            stream: true,
            document_ids: isMulti ? effectiveDocumentIds : undefined,
          }),
          signal: controller.signal,
        })
      );

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.detail || "Error al procesar el mensaje");
        setIsLoading(false);
        return;
      }

      // Check if the server returned a JSON response (non-streaming fallback)
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const chatResponse = await response.json();
        handleNonStreamingResponse(chatResponse);
        return;
      }

      // Streaming SSE path
      await handleStreamingResponse(response, controller.signal);
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") {
        // User cancelled — handled in the finally block.
        return;
      }
      toast.error("Error de conexión al enviar el mensaje");
      console.error("Chat error:", error);
      setIsLoading(false);
    } finally {
      if (streamControllerRef.current === controller) {
        streamControllerRef.current = null;
      }
    }
  };

  const handleNonStreamingResponse = (chatResponse: any) => {
    if (chatResponse.conversation_id) {
      syncBackendId(chatResponse.conversation_id);
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: chatResponse.response,
      citations: chatResponse.citations?.map((citation: { page: number; snippet: string; similarity?: number; document?: string }) => ({
        page: citation.page,
        snippet: citation.snippet,
        similarity: citation.similarity,
        document: citation.document,
      })),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);

    if (!chatResponse.success && chatResponse.error) {
      toast.error(chatResponse.error);
    }
  };

  const handleStreamingResponse = async (
    response: Response,
    signal: AbortSignal,
  ) => {
    const reader = response.body?.getReader();
    if (!reader) {
      toast.error("No se pudo leer la respuesta del servidor");
      setIsLoading(false);
      return;
    }

    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      citations: [],
      timestamp: new Date()
    };
    setMessages(prev => [...prev, assistantMessage]);

    const decoder = new TextDecoder();
    let buffer = '';
    let pendingCitations: Citation[] = [];
    let pendingConversationId: string | null = null;
    let sawError = false;

    const updateAssistantMessage = (
      updater: (msg: Message) => Message
    ) => {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.id !== assistantId || last.role !== 'assistant') return prev;
        const updated = [...prev];
        updated[updated.length - 1] = updater(last);
        return updated;
      });
    };

    // Listen for client-side cancellation
    const onAbort = () => {
      try {
        reader.cancel();
      } catch {}
    };
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      while (true) {
        if (signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = 'message';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          if (raw === '[DONE]') continue;

          try {
            const parsed = JSON.parse(raw);
            // Ignore heartbeat pings (server keepalive)
            if (eventType === 'ping') continue;

            if (eventType === 'meta' || parsed.event === 'meta') {
              pendingConversationId = parsed.conversation_id || null;
              pendingCitations = (parsed.citations || []).map((c: any) => ({
                page: c.page,
                snippet: c.snippet,
                similarity: c.similarity,
                document: c.document,
              }));
            } else if (eventType === 'thinking_start') {
              updateAssistantMessage(msg => ({
                ...msg,
                thinkingStartedAt: msg.thinkingStartedAt ?? Date.now(),
                thinkingDone: false,
              }));
            } else if (eventType === 'thinking_delta') {
              const delta = parsed.delta || '';
              updateAssistantMessage(msg => ({
                ...msg,
                thinking: (msg.thinking ?? '') + delta,
                thinkingStartedAt: msg.thinkingStartedAt ?? Date.now(),
                thinkingDone: false,
              }));
            } else if (eventType === 'thinking_end') {
              updateAssistantMessage(msg => ({
                ...msg,
                thinkingDone: true,
              }));
            } else if (eventType === 'text_delta' || parsed.event === 'text_delta') {
              const delta = parsed.delta || '';
              updateAssistantMessage(msg => ({
                ...msg,
                content: msg.content + delta,
                citations: pendingCitations.length > 0 ? pendingCitations : msg.citations,
              }));
            } else if (eventType === 'summary' || parsed.event === 'summary') {
              // Telemetry event from the server (duration, tokens, model).
              // We don't surface it in the UI yet, but keep it for future use.
              if (typeof window !== "undefined") {
                (window as unknown as { __lastStreamSummary?: unknown }).__lastStreamSummary = parsed;
              }
            } else if (eventType === 'error' || parsed.event === 'error') {
              sawError = true;
              toast.error(parsed.error || "Error en la respuesta");
            }
          } catch (e) {
            // ignore malformed SSE lines
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
      toast.error("Error de conexión durante la respuesta");
    } finally {
      signal.removeEventListener("abort", onAbort);
      try {
        reader.releaseLock();
      } catch {}
      setIsLoading(false);
      if (pendingConversationId) {
        syncBackendId(pendingConversationId);
      }
      // If the stream ended because the client cancelled mid-flight, mark
      // the assistant message so the UI can show a "(detenido)" hint.
      if (signal.aborted) {
        updateAssistantMessage(msg => ({
          ...msg,
          content: msg.content || '_(respuesta detenida por el usuario)_',
        }));
      }
      // Suppress unused-var warning for sawError (kept for future telemetry)
      void sawError;
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

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toMarkdown = (msgs: Message[]): string => {
    const lines: string[] = [`# ${documentTitle}\n`];
    for (const m of msgs) {
      if (m.id === "welcome") continue;
      if (m.role === "user") {
        lines.push(`## Usuario\n\n${m.content}\n`);
      } else {
        lines.push(`## Cella (IA)\n\n${m.content}\n`);
        if (m.citations && m.citations.length > 0) {
          lines.push("### Citas\n");
          m.citations.forEach((c, i) => {
            const doc = c.document ? `${c.document} ` : "";
            const page = c.page ? `p.${c.page}` : "";
            lines.push(`[${i + 1}] (${doc}${page}) “${c.snippet}”\n`);
          });
        }
      }
    }
    return lines.join("\n").trimEnd() + "\n";
  };

  const toJson = (msgs: Message[]): string =>
    JSON.stringify(
      {
        document_id: documentId,
        document_title: documentTitle,
        document_ids: isMulti ? effectiveDocumentIds : undefined,
        messages: msgs
          .filter((m) => m.id !== "welcome")
          .map((m) => ({
            role: m.role,
            content: m.content,
            citations: m.citations ?? [],
            timestamp: m.timestamp.toISOString(),
          })),
      },
      null,
      2
    );

  const exportConversation = async (format: "md" | "json") => {
    try {
      if (backendConversationId) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/conversations/${backendConversationId}/export?format=${format}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          throw new Error((await res.json().catch(() => null))?.detail || "Error al exportar");
        }
        const blob = await res.blob();
        downloadBlob(blob, `cella-conversation.${format === "md" ? "md" : "json"}`);
        toast.success("Conversación exportada");
        return;
      }

      // Fallback: export the in-memory transcript
      const filename = `cella-transcript.${format === "md" ? "md" : "json"}`;
      const content = format === "md" ? toMarkdown(messages) : toJson(messages);
      downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), filename);
      toast.success("Conversación exportada (local)");
    } catch (err) {
      console.error("Export failed", err);
      toast.error(err instanceof Error ? err.message : "No se pudo exportar la conversación");
    }
  };

  return (
    <div       className={cn("flex flex-col h-full bg-transparent", className)}>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-[792px] mx-auto space-y-6">
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
            <div
              className={cn(
                "flex flex-col",
                message.role === "user" ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[700px] rounded-xl px-4 py-3 zen-text-body leading-relaxed zen-read-text",
                  message.role === "user" &&
                    "bg-[var(--surface-container-high)]/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                )}
              >
                {message.role === "assistant" && message.thinkingStartedAt && (
                  <ThinkingBlock
                    content={message.thinking ?? ""}
                    startedAt={message.thinkingStartedAt}
                    streaming={!message.thinkingDone}
                  />
                )}
                <div className="break-words">
                  {formatMessageContent(message.content)}
                </div>

                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--outline-variant)]/50">
                    <button
                      onClick={() => toggleCitations(message.id)}
                      className="flex items-center gap-1.5 w-full text-left zen-text-body zen-read-text hover:opacity-70 transition-opacity"
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--primary-fixed)" }} />
                      <span className="font-label-mono font-medium">
                        Citas ({message.citations.length})
                      </span>
                      {expandedCitations.has(message.id) ? (
                        <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                      )}
                    </button>

                    {expandedCitations.has(message.id) && (
                      <div className="mt-2 space-y-2">
                        {message.citations.map((citation, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 pl-2 border-l-2 border-[var(--outline-variant)]/30"
                          >
                            <button
                              onClick={() => onCitationClick?.(citation.page)}
                              className="shrink-0 px-1.5 py-px rounded bg-[var(--primary-fixed)]/10 text-[var(--primary-fixed)] font-label-mono text-(length:--zen-fs-label) font-medium hover:bg-[var(--primary-fixed)]/20 transition-colors cursor-pointer"
                            >
                              P.{citation.page}
                            </button>
                            <span className="zen-text-body zen-read-text leading-relaxed">
                              {citation.snippet}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(message.content)}
                  className="p-1 rounded text-[var(--on-surface-variant)]/60 hover:text-[var(--primary-fixed)] hover:bg-[var(--surface-container-high)] transition-colors"
                  title="Copiar respuesta"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {message.role === "assistant" && (
                  <>
                    <button
                      onClick={() => exportConversation("md")}
                      title="Exportar Markdown"
                      className="p-1 rounded text-[var(--on-surface-variant)]/60 hover:text-[var(--primary-fixed)] hover:bg-[var(--surface-container-high)] transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => exportConversation("json")}
                      title="Exportar JSON"
                      className="p-1 rounded text-[var(--on-surface-variant)]/60 hover:text-[var(--primary-fixed)] hover:bg-[var(--surface-container-high)] transition-colors"
                    >
                      <Braces className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {messages.length === 1 && !isLoading && (
          <div className="flex items-start gap-2">
            <div className="max-w-[85%]">
              <p className="text-(length:--zen-fs-label) uppercase tracking-[0.15em] text-[var(--on-surface-variant)]/60 mb-2 px-1">
                Preguntas sugeridas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendMessage(prompt)}
                    className="px-2.5 py-1.5 rounded-full border border-[var(--outline-variant)]/30 bg-[var(--surface-container-high)]/40 text-(length:--zen-fs-secondary) text-[var(--on-surface-variant)] hover:border-[var(--primary-fixed)] hover:text-[var(--primary-fixed)] transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
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
        onStop={stopStreaming}
      />
    </div>
  );
}
