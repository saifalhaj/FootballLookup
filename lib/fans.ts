// Turns the raw StatsBomb goal record into things a casual fan reads instantly:
// a flag, a plain-language description of the finish, a rarity tag, and a curated
// shortlist of the tournament's most spectacular goals.

import type { Goal } from "@/components/GoalGalaxy";

const FLAGS: Record<string, string> = {
  Argentina: "🇦🇷", France: "🇫🇷", Croatia: "🇭🇷", Morocco: "🇲🇦",
  Netherlands: "🇳🇱", Brazil: "🇧🇷", Portugal: "🇵🇹", England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Spain: "🇪🇸", Japan: "🇯🇵", Senegal: "🇸🇳", Poland: "🇵🇱",
  Switzerland: "🇨🇭", Germany: "🇩🇪", Belgium: "🇧🇪", Canada: "🇨🇦",
  Cameroon: "🇨🇲", Ecuador: "🇪🇨", Uruguay: "🇺🇾", Ghana: "🇬🇭",
  Serbia: "🇷🇸", Tunisia: "🇹🇳", Mexico: "🇲🇽", Denmark: "🇩🇰",
  "Costa Rica": "🇨🇷", Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", Iran: "🇮🇷", Australia: "🇦🇺",
  Qatar: "🇶🇦", "Saudi Arabia": "🇸🇦", "South Korea": "🇰🇷", "Korea Republic": "🇰🇷",
  "United States": "🇺🇸", USA: "🇺🇸",
};

export function flagOf(team: string | null): string {
  if (!team) return "⚽";
  return FLAGS[team] ?? "⚽";
}

/** Shorten StatsBomb's full legal names to something fan-facing where we can. */
const KNOWN_AS: Record<string, string> = {
  "Lionel Andrés Messi Cuccittini": "Lionel Messi",
  "Kylian Mbappé Lottin": "Kylian Mbappé",
  "Julián Álvarez": "Julián Álvarez",
  "Neymar da Silva Santos Júnior": "Neymar",
  "Bukayo Saka": "Bukayo Saka",
  "Cody Mathès Gakpo": "Cody Gakpo",
  "Enner Remberto Valencia Lastra": "Enner Valencia",
  "Richarlison de Andrade": "Richarlison",
  "Marcus Thuram": "Marcus Thuram",
  "Olivier Giroud": "Olivier Giroud",
};

export function nameOf(player: string | null): string {
  if (!player) return "Unknown";
  if (KNOWN_AS[player]) return KNOWN_AS[player];
  // Fall back to "First Last" from a long legal name.
  const parts = player.split(" ");
  if (parts.length <= 2) return player;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

const M_TO_YD = 1.09361;
export function distanceYards(g: Goal): number {
  return Math.round(Math.hypot(g.ox, g.oz) * M_TO_YD);
}

/** A short, punchy tag — or null when the goal is unremarkable. */
export function rarityTag(g: Goal): string | null {
  if (g.pen) return "PENALTY";
  if (g.xg == null) return null;
  if (g.xg < 0.04) return "WONDER GOAL";
  if (g.xg < 0.1) return "SCREAMER";
  if (g.xg < 0.22) return "GREAT STRIKE";
  if (g.xg > 0.7) return "TAP-IN";
  return null;
}

/** One human sentence describing how the goal was scored. */
export function describe(g: Goal): string {
  const yd = distanceYards(g);
  const topCorner = g.ty > 1.65 && Math.abs(g.tx) > 1.7;
  const roof = g.ty > 1.9;
  const farCorner = Math.abs(g.tx) > 2.7;
  const low = g.ty < 0.55;

  const placement = topCorner
    ? "into the top corner"
    : roof
      ? "into the roof of the net"
      : farCorner
        ? "into the far corner"
        : low
          ? "low past the keeper"
          : "past the keeper";

  if (g.pen) return `Penalty, tucked away ${placement}`;

  let how: string;
  if (yd >= 30) how = `A ${yd}-yard rocket`;
  else if (yd >= 22) how = `A ${yd}-yard strike`;
  else if (yd >= 16) how = "From the edge of the box";
  else if (g.xg != null && g.xg < 0.1) how = "An improbable finish";
  else if (g.xg != null && g.xg > 0.6) how = "A close-range finish";
  else how = "A cool finish";

  return `${how} ${placement}`;
}

const STAGE_WEIGHT: Record<string, number> = {
  Final: 1.0,
  "Semi-finals": 0.82,
  "3rd Place Final": 0.55,
  "Quarter-finals": 0.62,
  "Round of 16": 0.42,
  "Group Stage": 0.22,
};

/**
 * Curate the tournament's most spectacular goals for the guided tour. Rewards
 * long range and improbability (low xG), lifts knockout-round drama, and plays
 * down penalties. Returns goal indices, best first.
 */
export function computeHighlights(goals: Goal[], n = 12): number[] {
  const scored = goals.map((g, i) => {
    const yd = distanceYards(g);
    const improb = 1 - (g.xg ?? 0.3);
    const dist = Math.min(1, yd / 32);
    const stage = STAGE_WEIGHT[g.stage ?? ""] ?? 0.2;
    const penalty = g.pen ? 0.7 : 0;
    return { i, score: improb * 1.0 + dist * 1.35 + stage * 0.6 - penalty };
  });
  scored.sort((a, b) => b.score - a.score);

  // Keep it varied — at most 2 goals from any one scorer.
  const perPlayer = new Map<string, number>();
  const picked: number[] = [];
  for (const s of scored) {
    const p = goals[s.i].player ?? "?";
    const c = perPlayer.get(p) ?? 0;
    if (c >= 2) continue;
    perPlayer.set(p, c + 1);
    picked.push(s.i);
    if (picked.length >= n) break;
  }
  return picked;
}
