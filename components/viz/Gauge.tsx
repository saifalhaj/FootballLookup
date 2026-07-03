"use client";

import type { GaugeSpec } from "@/lib/viz";
import CountUp from "./CountUp";
import { useInView } from "./motion";
import s from "./viz.module.css";

const R = 34;
const CIRC = 2 * Math.PI * R;

/** Donut gauge: amber arc sweeps to pct once in view. */
export default function Gauge({ label, pct, detail }: Omit<GaugeSpec, "key">) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const target = CIRC * (1 - Math.min(pct, 100) / 100);

  return (
    <div ref={ref} className={s.gauge} data-in={inView ? "" : undefined}>
      <div className={s.dial}>
        <svg viewBox="0 0 88 88" role="img" aria-label={`${label}: ${Math.round(pct)} percent`}>
          <circle cx="44" cy="44" r={R} className={s.track} />
          <circle
            cx="44"
            cy="44"
            r={R}
            className={s.arc}
            strokeDasharray={CIRC}
            strokeDashoffset={inView ? target : CIRC}
            strokeLinecap="round"
            transform="rotate(-90 44 44)"
          />
        </svg>
        <div className={s.dialCenter} aria-hidden>
          {/* land together with the arc sweep (1.2s + 0.15s delay) */}
          <CountUp to={pct} suffix="%" duration={1200} delay={150} />
        </div>
      </div>
      <span className={s.gaugeLabel}>{label}</span>
      <span className={s.gaugeDetail}>{detail}</span>
    </div>
  );
}
