"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  value: number;
  duration?: number; // ms
  decimals?: number; // override
  suffix?: string;
  className?: string;
};

export default function CountUp({ value, duration = 800, decimals, suffix = "", className }: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  const from = useRef(0);

  useEffect(() => {
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const animate = (ts: number) => {
      if (start.current === null) start.current = ts;
      const p = Math.min(1, (ts - start.current) / duration);
      setDisplay(from.current + (value - from.current) * ease(p));
      if (p < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); start.current = null; from.current = display; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const decs = typeof decimals === 'number' ? decimals : value % 1 === 0 ? 0 : 1;
  const text = `${display.toFixed(decs)}${suffix}`;
  return <span className={className}>{text}</span>;
}

