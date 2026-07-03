"use client";

import type { RadarAxis } from "@/lib/viz";
import { useInView } from "./motion";
import s from "./viz.module.css";

const CX = 190;
const CY = 182;
const R = 96;

/** Position-aware radar on a dark broadcast panel. Pure SVG, no chart lib. */
export default function Radar({ axes }: { axes: RadarAxis[] }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const n = axes.length;

  const angle = (i: number) => ((-90 + (i * 360) / n) * Math.PI) / 180;
  const px = (i: number, r: number) => CX + r * Math.cos(angle(i));
  const py = (i: number, r: number) => CY + r * Math.sin(angle(i));
  const ringPts = (f: number) =>
    axes.map((_, i) => `${px(i, R * f).toFixed(1)},${py(i, R * f).toFixed(1)}`).join(" ");
  const shapePts = axes
    .map((ax, i) => `${px(i, ax.norm * R).toFixed(1)},${py(i, ax.norm * R).toFixed(1)}`)
    .join(" ");

  const aria = `Role radar: ${axes.map((a) => `${a.label} ${a.display}`).join(", ")}`;

  return (
    <div ref={ref} className={s.radarWrap} data-in={inView ? "" : undefined}>
      <svg viewBox="0 0 380 350" role="img" aria-label={aria}>
        {[1 / 3, 2 / 3, 1].map((f) => (
          <polygon key={f} points={ringPts(f)} className={s.ring} />
        ))}
        {axes.map((_, i) => (
          <line key={i} x1={CX} y1={CY} x2={px(i, R)} y2={py(i, R)} className={s.spoke} />
        ))}

        <polygon points={shapePts} className={s.shape} />
        {axes.map((ax, i) => (
          <circle
            key={ax.label}
            cx={px(i, ax.norm * R)}
            cy={py(i, ax.norm * R)}
            r="2.6"
            className={s.dot}
            style={{ transitionDelay: `${350 + i * 60}ms` }}
          />
        ))}
        <circle cx={CX} cy={CY} r="1.6" className={s.hub} />

        {axes.map((ax, i) => {
          const c = Math.cos(angle(i));
          const sn = Math.sin(angle(i));
          const anchor = c > 0.35 ? "start" : c < -0.35 ? "end" : "middle";
          const lx = px(i, R + 18);
          const ly = py(i, R + 18) + (sn < -0.9 ? -8 : sn > 0.9 ? 10 : 2);
          return (
            <text key={ax.label} x={lx} y={ly} textAnchor={anchor} className={s.axLabel}>
              <tspan x={lx} dy="0">
                {ax.label}
              </tspan>
              <tspan x={lx} dy="16" className={s.axValue}>
                {ax.display}
              </tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
}
