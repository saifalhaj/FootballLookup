// Self-check for the viz math. Run: npx --yes tsx lib/viz.test.ts
import assert from "node:assert/strict";
import { radarAxes, gaugeSpecs, parseFee } from "./viz";
import type { SeasonStats, StatLine } from "./providers/types";

const line = (key: string, raw: number | null): StatLine => ({
  key,
  label: key,
  raw,
  value: raw == null ? "—" : String(raw),
});

const attacker: SeasonStats = {
  position: "Attacker",
  rating: "7.4",
  number: 9,
  primary: [line("goals", 27), line("assists", 5), line("shotsOn", 61), line("dribbles", 18)],
  secondary: [
    line("apps", 31),
    line("minutes", 2558),
    line("shotsTotal", 104),
    line("keyPasses", 22),
    line("duelsWon", 120),
    line("duelsTotal", 300),
    line("dribAtt", 40),
    line("conversion", 26),
    line("passAccuracy", 74),
  ],
};

// Radar: 27 goals in 2558' = 0.95 per 90 → clamped to 1.0 vs the 0.85 bench.
const axes = radarAxes(attacker)!;
assert.ok(axes.length >= 4);
const goalsAx = axes.find((a) => a.label === "Goals")!;
assert.equal(goalsAx.norm, 1);
assert.equal(goalsAx.display, "0.95");
// All norms clamped into (0, 1].
for (const a of axes) assert.ok(a.norm > 0 && a.norm <= 1, `${a.label} norm in range`);

// Too few minutes → no radar (honesty guard).
assert.equal(radarAxes({ ...attacker, secondary: [line("minutes", 100)] }), null);

// Gauges: attacker order = conversion, shot accuracy, dribbles (first 3 non-null).
const g = gaugeSpecs(attacker);
assert.deepEqual(g.map((x) => x.key), ["conversion", "shotAcc", "dribbles"]);
assert.equal(Math.round(g[1]!.pct), 59); // 61 of 104 on target
assert.equal(g[2]!.detail, "18 of 40 completed");

// GK radar: conceded axis inverted (lower conceded → higher norm).
const gk: SeasonStats = {
  position: "Goalkeeper",
  rating: "7.0",
  number: 1,
  primary: [line("saves", 110), line("conceded", 30), line("penSaved", 2), line("apps", 38)],
  secondary: [line("minutes", 3420), line("passAccuracy", 80)],
};
const gkAxes = radarAxes(gk)!;
const stop = gkAxes.find((a) => a.label === "Conceded")!;
// 30 conceded in 3420' = 0.79/90 → norm = 1 - 0.79/2.4 ≈ 0.67
assert.ok(stop.norm > 0.6 && stop.norm < 0.72, "inverted conceded norm");
assert.equal(gkAxes.find((a) => a.label === "Avail")!.display, "100%");

// All-competition minutes above the 38-match basis cap at 100%, not "132%".
const busyGk = radarAxes({
  ...gk,
  secondary: [line("minutes", 4500), line("passAccuracy", 80)],
})!;
assert.equal(busyGk.find((a) => a.label === "Avail")!.display, "100%");

// Fee parsing.
assert.equal(parseFee("€ 60M").amount, 60_000_000);
assert.equal(parseFee("£ 50M").currency, "£");
assert.equal(parseFee("€ 60M").currency, "€");
assert.equal(parseFee("€ 2.5M").amount, 2_500_000);
assert.equal(parseFee("800K").amount, 800_000);
assert.equal(parseFee("€ 950Th.").amount, 950_000);
assert.equal(parseFee("Loan").amount, null);
assert.equal(parseFee("Free").amount, null);
assert.equal(parseFee("N/A").amount, null);
assert.equal(parseFee(undefined).label, "—");
// A bare number with no currency/magnitude isn't a fee.
assert.equal(parseFee("2").amount, null);

console.log("viz: all checks passed");
