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

/**
 * The bake already stores StatsBomb's `player_nickname` — the name fans use.
 * Don't shorten legal names here: Spanish naming puts the paternal surname
 * second-to-last, so "Nahuel Molina Lucero" would wrongly become "Nahuel Lucero".
 */
export function nameOf(player: string | null): string {
  return player ?? "Unknown";
}

const M_TO_YD = 1.09361;
export function distanceYards(g: Goal): number {
  return Math.round(Math.hypot(g.ox, g.oz) * M_TO_YD);
}

/**
 * Some goals are legendary for reasons the shot data cannot see. Maradona's Goal
 * of the Century is an 11-metre shot with 0.608 xG — the sixty-metre dribble
 * before it doesn't exist in a shot record, so the maths would call it an
 * ordinary finish. These few pins carry the knowledge the data can't.
 * Matched against what the baked data actually says (StatsBomb's clock can run a
 * minute behind the popular record).
 */
type Legend = { season: string; player: RegExp; minute: number; tag: string; note: string };
const LEGENDS: Legend[] = [
  {
    season: "1986", player: /Maradona/, minute: 50, tag: "HAND OF GOD",
    note: "Punched in with his left hand. The referee never saw it.",
  },
  {
    season: "1986", player: /Maradona/, minute: 54, tag: "GOAL OF THE CENTURY",
    note: "Sixty metres, eleven touches, half of England beaten — the greatest goal ever scored.",
  },
  {
    season: "1970", player: /Pelé/, minute: 17, tag: "THE 1970 FINAL",
    note: "A header to open the final, for the greatest team ever assembled.",
  },
  {
    season: "1958", player: /Pelé/, minute: 54, tag: "AGED SEVENTEEN",
    note: "Flicked it over the defender and volleyed in — seventeen years old, in a World Cup final.",
  },
  {
    season: "1958", player: /Pelé/, minute: 90, tag: "AGED SEVENTEEN",
    note: "A looping header to finish the final. He wept on the pitch afterwards.",
  },

  // Men's 2022
  {
    season: "2022", player: /Richarlison/, minute: 72, tag: "GOAL OF THE TOURNAMENT",
    note: "Chest, touch up, scissor kick from thirteen yards. Nobody scored better in 2022.",
  },
  {
    season: "2022", player: /Al Dawsari/, minute: 52, tag: "THE UPSET",
    note: "Turned two defenders and bent it into the top corner from twenty-three yards — Saudi Arabia beat the eventual champions.",
  },
  {
    season: "2022", player: /Chávez/, minute: 51, tag: "FROM THIRTY-THREE YARDS",
    note: "A free kick from thirty-three yards, straight into the top corner.",
  },
  {
    season: "2022", player: /Messi/, minute: 107, tag: "THE FINAL",
    note: "Extra time in the final, bundled in from five yards. Argentina thought they had won it.",
  },
  {
    season: "2022", player: /Mbapp/, minute: 80, tag: "2–2 FROM NOWHERE",
    note: "A volley on the turn from eighteen yards, ninety seconds after his penalty. The final started again.",
  },
  {
    season: "2022", player: /Mbapp/, minute: 117, tag: "HAT-TRICK IN A FINAL",
    note: "The first since 1966 — and it still wasn't enough.",
  },

  // Men's 2018
  {
    season: "2018", player: /Pavard/, minute: 56, tag: "GOAL OF THE TOURNAMENT",
    note: "A first-time volley from twenty-six yards into the far top corner. The best goal of 2018.",
  },
  {
    season: "2018", player: /Ronaldo/, minute: 87, tag: "THE HAT-TRICK",
    note: "A free kick over the wall from twenty-four yards to rescue a 3–3 against Spain.",
  },
  {
    season: "2018", player: /Kroos/, minute: 94, tag: "LAST TOUCH OF THE GAME",
    note: "Ninety-fourth minute, a free kick into the top corner from twenty-two yards. A one-in-a-hundred shot.",
  },
  {
    season: "2018", player: /Mandžukić/, minute: 108, tag: "CROATIA'S FIRST FINAL",
    note: "Extra time against England, nine yards out — and Croatia were in a World Cup final.",
  },
  {
    season: "2018", player: /Quaresma/, minute: 44, tag: "THE OUTSIDE OF THE BOOT",
    note: "Bent in with the outside of his right foot from twenty-five yards.",
  },

  // Women's 2023
  {
    season: "2023", player: /Carmona/, minute: 28, tag: "WON THE WORLD CUP",
    note: "Low into the corner from twenty yards — the only goal of the final.",
  },
  {
    season: "2023", player: /Caicedo/, minute: 51, tag: "EIGHTEEN YEARS OLD",
    note: "Cut inside and found the very top corner against Germany, at eighteen.",
  },
  {
    season: "2023", player: /Kerr/, minute: 62, tag: "SEMI-FINAL THUNDERBOLT",
    note: "Twenty-five yards, on the run, into the corner — and Australia were level in the semi-final.",
  },

  // Women's 2019
  {
    season: "2019", player: /Marta/, minute: 73, tag: "THE ALL-TIME RECORD",
    note: "A penalty for her seventeenth World Cup goal — more than anyone has scored, in the women's game or the men's.",
  },
  {
    season: "2019", player: /Bronze/, minute: 56, tag: "SCREAMER",
    note: "Twenty-one yards, struck into the roof of the net.",
  },
];

export function legendOf(g: Goal): Legend | null {
  return (
    LEGENDS.find(
      (l) => l.season === g.season && l.minute === g.minute && l.player.test(g.player ?? ""),
    ) ?? null
  );
}

/** A short, punchy tag — or null when the goal is unremarkable. */
export function rarityTag(g: Goal): string | null {
  const legend = legendOf(g);
  if (legend) return legend.tag;
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
  const legend = legendOf(g);
  if (legend) return legend.note;
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

function spectacleOf(g: Goal): number {
  const yd = distanceYards(g);
  const improb = 1 - (g.xg ?? 0.3);
  const dist = Math.min(1, yd / 32);
  const stage = STAGE_WEIGHT[g.stage ?? ""] ?? 0.2;
  const penalty = g.pen ? 0.7 : 0;
  return improb * 1.0 + dist * 1.35 + stage * 0.6 - penalty;
}

/**
 * Curate the guided tour. Three rules:
 *  1. Legendary goals always make it — the maths can't see why they matter.
 *  2. Every goal of the Final earns a place: it's the game everyone remembers,
 *     and the spectacle maths would drop Messi's and Mbappé's penalties.
 *  3. The rest are the most spectacular strikes — long range + improbable (low
 *     xG) + knockout drama, capped at 2 per scorer so it stays varied.
 * Ordered as a crescendo: the screamers first, then the guaranteed goals in
 * chronological order (which for the Classics archive walks 1958 → 1986).
 */
export function computeHighlights(goals: Goal[], n = 14): number[] {
  const keyOf = (g: Goal) => Number(g.season ?? 0) * 1000 + (g.minute ?? 0);
  const guaranteed = goals
    .map((g, i) => ({ g, i }))
    .filter((x) => x.g.stage === "Final" || legendOf(x.g))
    .sort((a, b) => keyOf(a.g) - keyOf(b.g))
    .map((x) => x.i);
  const isGuaranteed = new Set(guaranteed);

  const rest = goals
    .map((g, i) => ({ i, score: spectacleOf(g) }))
    .filter((x) => !isGuaranteed.has(x.i))
    .sort((a, b) => b.score - a.score);

  const perPlayer = new Map<string, number>();
  const picked: number[] = [];
  const room = Math.max(0, n - guaranteed.length);
  for (const s of rest) {
    const p = goals[s.i].player ?? "?";
    const c = perPlayer.get(p) ?? 0;
    if (c >= 2) continue;
    perPlayer.set(p, c + 1);
    picked.push(s.i);
    if (picked.length >= room) break;
  }
  return [...picked, ...guaranteed];
}

/** Every nation that scored, for the team picker. */
export function teamsWithGoals(goals: Goal[]): string[] {
  return [...new Set(goals.map((g) => g.team).filter(Boolean) as string[])].sort();
}

/** One nation's goals, in the order they scored them — their run through the cup. */
export function goalsForTeam(goals: Goal[], team: string): number[] {
  return goals
    .map((g, i) => ({ g, i }))
    .filter((x) => x.g.team === team)
    .sort((a, b) => (a.g.minute ?? 0) - (b.g.minute ?? 0))
    .map((x) => x.i);
}
