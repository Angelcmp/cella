const ITEMS = [
  "MULTI-MODELO",
  "PDF / DOCX / PPTX / TXT",
  "PRIVADO",
  "CITAS VERIFICABLES",
];

function Row() {
  return (
    <span className="inline-flex items-center font-mono text-[14px] tracking-widest text-[var(--text-secondary)] opacity-80">
      {ITEMS.map((item, i) => (
        <span
          key={i}
          className={`px-8 border-r border-[var(--border-strong)] ${
            item === "PRIVADO" ? "text-[var(--accent-strong)]" : ""
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
    <div className="w-full border-y border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 backdrop-blur-md py-3 overflow-hidden relative z-20 ticker-mask select-none" aria-hidden>
      <div className="ticker-track">
        <Row />
        <Row />
      </div>
    </div>
  );
}
