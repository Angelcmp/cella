"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function QrButton({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-border px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted"
            aria-label="Ver QR"
          >
            <Globe className="w-4 h-4 mr-2" /> Ver QR
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={8}>
          QR a la URL pública del evento: {url}
        </TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Escanea el QR</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <img src={qrUrl} alt="Código QR de la demo" className="rounded-md border border-border" />
            <p className="text-xs text-secondary break-all text-center">{url}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

