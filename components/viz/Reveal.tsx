"use client";

import { createElement, type ReactNode } from "react";
import { useInView } from "./motion";

// Adds data-in="" to its element once scrolled into view. Styles hook on it via
// attribute selectors ([data-in] …), which cross CSS-module boundaries cleanly.
export default function Reveal({
  as = "div",
  className,
  children,
  ariaLabel,
}: {
  as?: "div" | "section" | "ul" | "ol";
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const [ref, inView] = useInView<HTMLElement>();
  return createElement(
    as,
    { ref, className, "data-in": inView ? "" : undefined, "aria-label": ariaLabel },
    children,
  );
}
