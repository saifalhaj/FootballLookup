// Pure math for the broadcast graphics: per-90 normalization, radar axes,
// efficiency gauges, transfer-fee parsing. No React, no fetch — testable.
import type { SeasonStats } from "./providers/types";

const clamp = (n: number, lo = 0.04, hi = 1) => Math.min(hi, Math.max(lo, n));
const fmt90 = (n: number) => (n >= 10 ? n.toFixed(1) : n.toFixed(2));

function lineMap(stats: SeasonStats): Map<string, number | null> {
  const m = new Map<string, number | null>();
  for (const s of [...stats.primary, ...stats.secondary]) {
    if (!m.has(s.key) || m.get(s.key) == null) m.set(s.key, s.raw);
  }
  return m;
}

/* ---------------- Radar ---------------- */

export interface RadarAxis {
  label: string;
  /** 0..1, already clamped; 1 = elite benchmark */
  norm: number;
  /** formatted real value shown under the axis label */
  display: string;
}

// A full season for an elite player at each position, per 90 minutes. These are
// deliberate editorial benchmarks (labeled as such in the UI), not API data.
const MIN_MINUTES = 270; // ~3 full matches; below this a radar would be noise

export function radarAxes(stats: SeasonStats): RadarAxis[] | null {
  const m = lineMap(stats);
  const minutes = m.get("minutes");
  if (minutes == null || minutes < MIN_MINUTES) return null;

  const p90 = (key: string) => {
    const v = m.get(key);
    return v == null ? null : (v * 90) / minutes;
  };
  const per = (label: string, key: string, bench: number): RadarAxis | null => {
    const v = p90(key);
    return v == null ? null : { label, norm: clamp(v / bench), display: fmt90(v) };
  };
  const pctAx = (label: string, key: string, bench: number): RadarAxis | null => {
    const v = m.get(key);
    return v == null ? null : { label, norm: clamp(v / bench), display: `${Math.round(v)}%` };
  };
  const rating = stats.rating != null ? Number(stats.rating) : null;
  const rateAx: RadarAxis | null =
    rating == null || !Number.isFinite(rating)
      ? null
      : { label: "Rating", norm: clamp((rating - 6) / 2.4), display: rating.toFixed(1) };

  let axes: (RadarAxis | null)[];
  switch (stats.position) {
    case "Attacker":
      axes = [
        per("Goals", "goals", 0.85),
        per("Assists", "assists", 0.45),
        per("On target", "shotsOn", 2.2),
        per("Dribbles", "dribbles", 2.4),
        per("Key passes", "keyPasses", 2.2),
        per("Duels won", "duelsWon", 4.5),
      ];
      break;
    case "Midfielder":
      axes = [
        per("Key passes", "keyPasses", 2.6),
        per("Assists", "assists", 0.45),
        per("Goals", "goals", 0.35),
        per("Dribbles", "dribbles", 2.2),
        per("Tackles", "tackles", 2.6),
        per("Duels won", "duelsWon", 5.5),
      ];
      break;
    case "Defender":
      axes = [
        per("Tackles", "tackles", 2.8),
        per("Intercepts", "interceptions", 2.2),
        per("Blocks", "blocks", 1.1),
        per("Duels won", "duelsWon", 5.5),
        pctAx("Pass acc", "passAccuracy", 92),
        rateAx,
      ];
      break;
    case "Goalkeeper": {
      const c90 = p90("conceded");
      // Inverted: fuller = fewer goals conceded (footnoted in the UI).
      const stop: RadarAxis | null =
        c90 == null ? null : { label: "Conceded", norm: clamp(1 - c90 / 2.4), display: fmt90(c90) };
      const pen = m.get("penSaved");
      const penAx: RadarAxis | null =
        pen == null ? null : { label: "Pens saved", norm: clamp(pen / 4), display: String(pen) };
      // ponytail: 38-match league basis; cup/Europe minutes cap at 100%.
      const availRatio = Math.min(1, minutes / 3420);
      const avail: RadarAxis = {
        label: "Avail",
        norm: clamp(availRatio),
        display: `${Math.round(availRatio * 100)}%`,
      };
      axes = [per("Saves", "saves", 3.2), stop, penAx, avail, pctAx("Pass acc", "passAccuracy", 88), rateAx];
      break;
    }
    default:
      axes = [
        per("Goals", "goals", 0.5),
        per("Assists", "assists", 0.45),
        per("Dribbles", "dribbles", 2.2),
        per("Duels won", "duelsWon", 5),
        pctAx("Pass acc", "passAccuracy", 92),
        rateAx,
      ];
  }

  const usable = axes.filter((a): a is RadarAxis => a != null);
  return usable.length >= 4 ? usable : null;
}

/* ---------------- Gauges ---------------- */

export interface GaugeSpec {
  key: string;
  label: string;
  /** 0..100 */
  pct: number;
  detail: string;
}

export function gaugeSpecs(stats: SeasonStats): GaugeSpec[] {
  const m = lineMap(stats);
  const g = (key: string): number | null => m.get(key) ?? null;

  const ratioGauge = (
    key: string,
    label: string,
    numKey: string,
    denKey: string,
    noun: string,
  ): GaugeSpec | null => {
    const numV = g(numKey);
    const den = g(denKey);
    if (numV == null || den == null || den <= 0) return null;
    return {
      key,
      label,
      pct: Math.min(100, (numV / den) * 100),
      detail: `${numV.toLocaleString("en-US")} of ${den.toLocaleString("en-US")} ${noun}`,
    };
  };

  const duels = ratioGauge("duels", "Duel success", "duelsWon", "duelsTotal", "duels won");
  const dribbles = ratioGauge("dribbles", "Dribble success", "dribbles", "dribAtt", "completed");
  const shotAcc = ratioGauge("shotAcc", "Shot accuracy", "shotsOn", "shotsTotal", "on target");

  const conv = g("conversion");
  const goals = g("goals");
  const shots = g("shotsTotal");
  const conversion: GaugeSpec | null =
    conv == null
      ? null
      : {
          key: "conversion",
          label: "Conversion",
          pct: Math.min(100, conv),
          detail:
            goals != null && shots != null ? `${goals} goals from ${shots} shots` : "goals per shot",
        };

  const pass = g("passAccuracy");
  const passAcc: GaugeSpec | null =
    pass == null
      ? null
      : { key: "passAcc", label: "Pass accuracy", pct: Math.min(100, pass), detail: "main competition" };

  const order: (GaugeSpec | null)[] =
    stats.position === "Attacker"
      ? [conversion, shotAcc, dribbles, duels]
      : stats.position === "Midfielder"
        ? [passAcc, dribbles, duels, shotAcc]
        : stats.position === "Defender"
          ? [duels, passAcc, dribbles]
          : stats.position === "Goalkeeper"
            ? [passAcc, duels]
            : [duels, dribbles, shotAcc, passAcc];

  return order.filter((s): s is GaugeSpec => s != null).slice(0, 3);
}

/* ---------------- Transfer fees ---------------- */

export interface ParsedFee {
  /** numeric value in currency units, null for Loan / Free / N/A */
  amount: number | null;
  /** currency symbol, so bars only compare like with like */
  currency: string | null;
  label: string;
}

export function parseFee(type?: string): ParsedFee {
  const label = (type ?? "").trim();
  if (!label) return { amount: null, currency: null, label: "—" };
  // "Th" is API-Football's thousands suffix ("€ 950Th.")
  const m = label.match(/(\d+(?:[.,]\d+)?)\s*(M|K|Th)?/i);
  if (!m) return { amount: null, currency: null, label };
  const n = parseFloat(m[1]!.replace(",", "."));
  if (!Number.isFinite(n)) return { amount: null, currency: null, label };
  const suffix = m[2]?.toUpperCase();
  const mult = suffix === "M" ? 1e6 : suffix === "K" || suffix === "TH" ? 1e3 : 1;
  // A bare number with no magnitude and no currency sign isn't a fee ("N/A 2"…).
  if (mult === 1 && !/[€$£]/.test(label)) return { amount: null, currency: null, label };
  const currency = label.match(/[€$£]/)?.[0] ?? null;
  return { amount: n * mult, currency, label };
}
