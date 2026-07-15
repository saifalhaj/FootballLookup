// Bakes StatsBomb Open Data World Cup goals into a compact static JSON the app
// ships in its bundle. Run once (npm run bake); the output is committed. No API
// key, no runtime fetch — the data is historical and frozen.
//
// Usage:  node scripts/bake.mjs            # men's WC 2022 (default)
//         node scripts/bake.mjs 2022 2018  # add more men's World Cup years
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = "https://raw.githubusercontent.com/statsbomb/open-data/master/data";
const YARD = 0.9144; // StatsBomb pitch units are yards; we render in metres
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");

const years = process.argv.slice(2).length ? process.argv.slice(2) : ["2022"];

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// Run `worker` over `items` with limited concurrency.
async function pool(items, limit, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        await worker(items[idx], idx);
      } catch (e) {
        console.warn("  skip:", e.message);
      }
    }
  });
  await Promise.all(runners);
}

async function main() {
  console.log("Fetching competitions index…");
  const comps = await getJSON(`${BASE}/competitions.json`);

  const targets = comps.filter(
    (c) =>
      c.competition_name === "FIFA World Cup" &&
      c.competition_gender === "male" &&
      years.includes(String(c.season_name)),
  );
  if (!targets.length) {
    throw new Error(`No matching World Cup seasons for years: ${years.join(", ")}`);
  }

  const goals = [];
  for (const t of targets) {
    console.log(`\n${t.competition_name} ${t.season_name} — loading matches…`);
    const matches = await getJSON(`${BASE}/matches/${t.competition_id}/${t.season_id}.json`);
    const ids = matches.map((m) => m.match_id);
    // match_id → who played and at what stage, so each goal knows its opponent + round
    const minfo = new Map(
      matches.map((m) => [
        m.match_id,
        {
          home: m.home_team?.home_team_name ?? null,
          away: m.away_team?.away_team_name ?? null,
          stage: m.competition_stage?.name ?? null,
        },
      ]),
    );
    console.log(`  ${ids.length} matches; pulling events…`);

    let done = 0;
    await pool(ids, 6, async (id) => {
      const events = await getJSON(`${BASE}/events/${id}.json`);
      const info = minfo.get(id) ?? { home: null, away: null, stage: null };
      for (const e of events) {
        if (e.type?.name !== "Shot" || e.shot?.outcome?.name !== "Goal") continue;
        const loc = e.location;
        const end = e.shot.end_location;
        if (!loc || !end) continue;
        const team = e.team?.name ?? null;
        const opponent = team === info.home ? info.away : team === info.away ? info.home : null;
        goals.push({
          // target: the exact point the ball crossed the goal line (metres,
          // goal centre = origin; x = lateral, y = height)
          tx: +((end[1] - 40) * YARD).toFixed(3),
          ty: +(((end[2] ?? 0)) * YARD).toFixed(3),
          // origin: where the shot was struck (metres; z = depth into pitch)
          ox: +((loc[1] - 40) * YARD).toFixed(3),
          oz: +((120 - loc[0]) * YARD).toFixed(3),
          xg: e.shot.statsbomb_xg != null ? +e.shot.statsbomb_xg.toFixed(3) : null,
          player: e.player?.name ?? null,
          team,
          opponent,
          stage: info.stage,
          minute: e.minute ?? null,
          season: String(t.season_name),
          pen: e.shot.type?.name === "Penalty",
        });
      }
      done++;
      if (done % 8 === 0) console.log(`  …${done}/${ids.length} matches`);
    });
    console.log(`  ${t.season_name}: running total ${goals.length} goals`);
  }

  // Newest, most improbable first is irrelevant for the viz; keep source order.
  await mkdir(OUT_DIR, { recursive: true });
  const payload = {
    source: "StatsBomb Open Data",
    tournaments: targets.map((t) => `FIFA World Cup ${t.season_name}`),
    count: goals.length,
    goals,
  };
  const file = join(OUT_DIR, "goals.json");
  await writeFile(file, JSON.stringify(payload));
  console.log(`\n✓ Baked ${goals.length} goals → ${file}`);
}

main().catch((e) => {
  console.error("Bake failed:", e);
  process.exit(1);
});
