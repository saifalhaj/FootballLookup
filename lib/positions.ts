import type { Position } from "./providers/types";

// Which stat keys headline the scoreboard for each role. Keys match the catalog
// built in apiFootball.ts. Everything not listed here still shows, de-emphasized.
export const PRIMARY_STATS: Record<Position, string[]> = {
  Goalkeeper: ["saves", "conceded", "penSaved", "apps"],
  Defender: ["tackles", "interceptions", "blocks", "duelsWon"],
  Midfielder: ["keyPasses", "assists", "passAccuracy", "dribbles"],
  Attacker: ["goals", "assists", "shotsOn", "dribbles"],
  Unknown: ["apps", "goals", "assists", "duelsWon"],
};

// Display label for a role (API says "Attacker"; football says "Forward").
export const POSITION_LABEL: Record<Position, string> = {
  Goalkeeper: "Goalkeeper",
  Defender: "Defender",
  Midfielder: "Midfielder",
  Attacker: "Forward",
  Unknown: "Player",
};

export function normalizePosition(raw?: string | null): Position {
  const p = (raw ?? "").toLowerCase();
  if (p.startsWith("goal")) return "Goalkeeper";
  if (p.startsWith("def")) return "Defender";
  if (p.startsWith("mid")) return "Midfielder";
  if (
    p.startsWith("att") ||
    p.startsWith("for") ||
    p.startsWith("str") ||
    p.startsWith("wing")
  )
    return "Attacker";
  return "Unknown";
}
