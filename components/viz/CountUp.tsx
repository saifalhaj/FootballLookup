"use client";

import { useEffect, useState } from "react";
import { useInView, useReducedMotion } from "./motion";

/** Animated number: counts up once in view; instant under reduced motion.
    `delay` lets the count land in step with a CSS entrance (e.g. flap stagger). */
export default function CountUp({
  to,
  decimals = 0,
  suffix = "",
  duration = 950,
  delay = 0,
}: {
  to: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
  delay?: number;
}) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView || !Number.isFinite(to)) return;
    if (reduced) {
      setN(to);
      return;
    }
    let raf: number;
    const t0 = performance.now() + delay;
    const tick = (t: number) => {
      // clamp low end: during the delay, p < 0 would render a negative number
      const p = Math.min(1, Math.max(0, (t - t0) / duration));
      const eased = 1 - Math.pow(1 - p, 3);
      setN(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, to, duration, delay]);

  const text = Number.isFinite(to)
    ? n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : "—";
  return (
    <span ref={ref}>
      {text}
      {suffix}
    </span>
  );
}
