"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { X } from "lucide-react";

interface CellaDialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  className?: string;
  style?: CSSProperties;
  maxWidth?: string;
}

export default function CellaDialog({
  open,
  onClose,
  children,
  title,
  className = "",
  style,
  maxWidth = "560px",
}: CellaDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [onClose]);

  const handleBackdrop = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) onClose();
  };

  return (
    <dialog
      ref={ref}
      onClick={handleBackdrop}
      style={{ maxWidth, ...style }}
      className={`celladialog m-auto rounded-[16px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0 text-[var(--text-primary)] shadow-soft outline-none ${className}`}
    >
      {title != null && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)]">
          <div className="text-(length:--zen-fs-title) font-semibold text-[var(--text-primary)]">{title}</div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--bg-muted)] text-[var(--text-muted)] transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="px-5 py-4 max-h-[80vh] overflow-y-auto">{children}</div>
    </dialog>
  );
}
