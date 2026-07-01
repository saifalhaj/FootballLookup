// Self-check for aggregateStats. Run: npx --yes tsx lib/providers/aggregate.test.ts
import assert from "node:assert/strict";
import { aggregateStats } from "./apiFootball";

const get = (lines: { key: string; raw: number | null; value: string }[], k: string) =>
  lines.find((s) => s.key === k);

// Attacker with two competition blocks (league + cup). League has more minutes.
const league = {
  team: { name: "FC League", logo: "l.png" },
  league: { name: "Top Division", season: 2023, logo: "d.png" },
  games: { appearences: 30, minutes: 2000, position: "Attacker", rating: "7.5", number: 9 },
  shots: { total: 80, on: 40 },
  goals: { total: 20, assists: 10, conceded: null, saves: null },
  passes: { total: 900, key: 50, accuracy: 78 },
  dribbles: { attempts: 60, success: 30 },
  cards: { yellow: 4, yellowred: 1, red: 1 },
};
const cup = {
  team: { name: "FC League", logo: "l.png" },
  league: { name: "Cup", season: 2023 },
  games: { appearences: 6, minutes: 500, position: "Attacker", rating: "6.0" },
  shots: { total: 20, on: 10 },
  goals: { total: 5, assists: 2 },
  passes: { key: 8, accuracy: 60 },
  dribbles: { attempts: 12, success: 8 },
  cards: { yellow: 1, red: 0 },
};

const att = aggregateStats([league, cup]);

// Position drives the headline set.
assert.deepEqual(att.primary.map((s) => s.key), ["goals", "assists", "shotsOn", "dribbles"]);

// Counting stats sum across both competitions.
assert.equal(get(att.primary, "goals")!.raw, 25);
assert.equal(get(att.primary, "assists")!.raw, 12);
assert.equal(get(att.primary, "shotsOn")!.raw, 50);
assert.equal(get(att.primary, "dribbles")!.raw, 38);
assert.equal(get(att.secondary, "apps")!.raw, 36);

// Red cards fold in second-yellows: (1+0) red + 1 yellowred = 2.
assert.equal(get(att.secondary, "red")!.raw, 2);

// Non-additive rate + rating come from the higher-minutes block (league).
assert.equal(att.rating, "7.5");
assert.equal(get(att.secondary, "passAccuracy")!.value, "78%");

// Conversion = goals / total shots = 25 / 100 = 25%.
assert.equal(get(att.secondary, "conversion")!.value, "25%");

// Defender picks a defensive headline set and reads the API's own spellings.
const def = aggregateStats([
  {
    games: { appearences: 34, minutes: 3000, position: "Defender", rating: "7.1" },
    tackles: { total: 90, blocks: 20, interceptions: 45 },
    duels: { total: 300, won: 180 },
  },
]);
assert.deepEqual(def.primary.map((s) => s.key), ["tackles", "interceptions", "blocks", "duelsWon"]);
assert.equal(get(def.primary, "duelsWon")!.raw, 180);

// Goalkeeper: penSaved must read penalty.saved (keeper saves), NOT penalty.commited
// (penalties conceded by fouling) — they are different fields.
const gk = aggregateStats([
  {
    games: { appearences: 38, minutes: 3420, position: "Goalkeeper", rating: "7.0" },
    goals: { conceded: 30, saves: 110 },
    penalty: { saved: 2, commited: 4 },
  },
]);
assert.deepEqual(gk.primary.map((s) => s.key), ["saves", "conceded", "penSaved", "apps"]);
assert.equal(get(gk.primary, "penSaved")!.raw, 2); // the 2 saved, not the 4 conceded
assert.equal(get(gk.primary, "saves")!.raw, 110);

// Red cards stay unknown (excluded) when no block reports card data — like yellow.
const noCards = aggregateStats([{ games: { appearences: 5, minutes: 400, position: "Midfielder" } }]);
assert.equal(get(noCards.secondary, "red"), undefined);
assert.equal(get(noCards.secondary, "yellow"), undefined);

// Empty/missing data must not throw, and unknown position falls back cleanly.
const empty = aggregateStats([]);
assert.equal(empty.position, "Unknown");
assert.equal(empty.primary.length, 4);
assert.equal(empty.primary[0]!.value, "—");

console.log("aggregateStats: all checks passed");
