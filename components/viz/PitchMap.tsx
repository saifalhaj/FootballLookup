"use client";

import type { Position } from "@/lib/providers/types";
import { useInView } from "./motion";
import s from "./viz.module.css";

// Vertical pitch, attacking upward. Band = the player's operating zone.
const ZONES: Record<Position, { band: [number, number]; spot: [number, number]; tag: string }> = {
  Goalkeeper: { band: [246, 288], spot: [100, 268], tag: "Between the posts" },
  Defender: { band: [196, 258], spot: [100, 226], tag: "Back line" },
  Midfielder: { band: [108, 192], spot: [100, 150], tag: "Engine room" },
  Attacker: { band: [28, 100], spot: [100, 66], tag: "Final third" },
  Unknown: { band: [108, 192], spot: [100, 150], tag: "Roaming role" },
};

/** SVG pitch with the position zone lit under the floodlights. */
export default function PitchMap({ position }: { position: Position }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const zone = ZONES[position];
  const [bandY1, bandY2] = zone.band;
  const [spotX, spotY] = zone.spot;

  // Chalk lines draw in sequence via pathLength + dashoffset.
  const line = (i: number) => ({
    className: s.pitchLine,
    pathLength: 1,
    style: { transitionDelay: `${i * 110}ms` },
  });

  return (
    <div ref={ref} className={s.pitchWrap} data-in={inView ? "" : undefined}>
      <svg viewBox="0 0 200 300" role="img" aria-label={`Typical zone: ${zone.tag}`}>
        <rect x="10" y="10" width="180" height="280" rx="2" {...line(0)} />
        <line x1="10" y1="150" x2="190" y2="150" {...line(1)} />
        <circle cx="100" cy="150" r="26" {...line(2)} />
        {/* penalty boxes */}
        <rect x="50" y="10" width="100" height="44" {...line(3)} />
        <rect x="50" y="246" width="100" height="44" {...line(4)} />
        {/* six-yard boxes */}
        <rect x="72" y="10" width="56" height="16" {...line(5)} />
        <rect x="72" y="274" width="56" height="16" {...line(6)} />

        <rect
          x="14"
          y={bandY1}
          width="172"
          height={bandY2 - bandY1}
          rx="6"
          className={s.zone}
        />
        <circle cx={spotX} cy={spotY} r="10" className={s.pulse} />
        <circle cx={spotX} cy={spotY} r="4.5" className={s.marker} />
      </svg>
      {/* SVG aria-label already announces the zone; hide the visible dupe */}
      <p className={s.pitchTag} aria-hidden="true">
        {zone.tag}
      </p>
    </div>
  );
}
