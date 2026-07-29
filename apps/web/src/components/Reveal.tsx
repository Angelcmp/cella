"use client";

import { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  once?: boolean;
  threshold?: number;
};

export default function Reveal({
  children,
  className,
  as = "div",
  once = true,
  threshold = 0.15,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            if (once) io.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [once, threshold]);

  const Comp: any = as;
  return (
    <Comp ref={ref} data-visible={visible ? "true" : "false"} className={className}>
      {children}
    </Comp>
  );
}

