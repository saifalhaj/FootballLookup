"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

/** True once the element has entered the viewport (fires once, then detaches). */
export function useInView<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    // threshold 0: a ratio threshold can never fire for elements much taller
    // than the viewport (ratio stays tiny); the rootMargin supplies the
    // "meaningfully on screen" offset instead.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, inView];
}

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Live prefers-reduced-motion flag for JS-driven animation (rAF, canvas).
 * useSyncExternalStore resolves before paint, so consumers never run a frame
 * of motion for reduced-motion users (a useState+useEffect version would).
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCE_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  );
}
