const ITEMS = [
  "MULTI-MODELO",
  "PDF / DOCX / PPTX / TXT",
  "PRIVADO",
  "CITAS VERIFICABLES",
];

function Row() {
  return (
    <span className="inline-flex items-center font-mono text-[13px] tracking-[0.2em] text-[var(--text-muted)]">
      {ITEMS.map((item, i) => (
        <span
          key={i}
          className={`px-8 border-r border-[var(--zen-line)] ${
            item === "PRIVADO" ? "text-[var(--primary-fixed)]" : ""
          }`}
        >
          {item}
        </span>
      ))}
    </span>
  );
}

export default function MarqueeTicker() {
  return (
    <div
      className="w-full border-y border-[var(--zen-line)] bg-[var(--zen-panel-alt)] py-3 overflow-hidden relative z-20 ticker-mask select-none"
      aria-hidden
    >
      <div className="ticker-track">
        <Row />
        <Row />
      </div>
    </div>
  );
}
