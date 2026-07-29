"use client";

import { useEffect, useRef } from "react";

type ParallaxProps = {
  children: React.ReactNode;
  strength?: number; // px max translation
  className?: string;
  as?: keyof JSX.IntrinsicElements;
};

export default function Parallax({ children, strength = 14, className, as = "div" }: ParallaxProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf: number | null = null;
    let running = false;

    const onScroll = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(() => {
        running = false;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        const center = rect.top + rect.height / 2;
        const ratio = Math.max(-1, Math.min(1, (center - vh / 2) / (vh / 2)));
        const y = (-ratio) * strength; // mueve en dirección opuesta al scroll
        el.style.transform = `translateY(${y.toFixed(2)}px)`;
      });
    };

    const onResize = () => onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [strength]);

  const Comp: any = as;
  return (
    <Comp ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </Comp>
  );
}

