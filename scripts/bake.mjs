// Bakes StatsBomb Open Data World Cup goals into one compact static JSON that
// the app ships. Run once (npm run bake); the output is committed. No API key,
// no runtime fetch — the data is historical and frozen.
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = "https://raw.githubusercontent.com/statsbomb/open-data/master/data";
const YARD = 0.9144; // StatsBomb pitch units are yards; we render in metres
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");

/**
 * What StatsBomb actually publishes. The first four are complete tournaments.
 * The historic seasons are only a handful of archived matches each — but they
 * happen to be Maradona's 1986 Argentina, Pelé's Brazil and Cruyff's
 * Netherlands, so they're merged into one honestly-labelled "Classics" bucket.
 */
const TOURNAMENTS = [
  { id: "2022", label: "Men's World Cup 2022", short: "2022", full: true, parts: [[43, 106]] },
  { id: "2018", label: "Men's World Cup 2018", short: "2018", full: true, parts: [[43, 3]] },
  { id: "w2023", label: "Women's World Cup 2023", short: "Women's 2023", full: true, parts: [[72, 107]] },
  { id: "w2019", label: "Women's World Cup 2019", short: "Women's 2019", full: true, parts: [[72, 30]] },
  {
    id: "classics",
    label: "Classics 1958–1990",
    short: "Classics",
    full: false,
    parts: [[43, 269], [43, 270], [43, 272], [43, 51], [43, 54], [43, 55]],
  },
];

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function pool(items, limit, worker) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        try {
          await worker(items[idx]);
        } catch (e) {
          console.warn("  skip:", e.message);
        }
      }
    }),
  );
}

async function bakePart(compId, seasonId, tournamentId, goals) {
  const matches = await getJSON(`${BASE}/matches/${compId}/${seasonId}.json`);
  const minfo = new Map(
    matches.map((m) => [
      m.match_id,
      {
        home: m.home_team?.home_team_name ?? null,
        away: m.away_team?.away_team_name ?? null,
        stage: m.competition_stage?.name ?? null,
        season: String(m.season?.season_name ?? ""),
      },
    ]),
  );

  await pool(matches.map((m) => m.match_id), 8, async (id) => {
    // Lineups carry `player_nickname` — the name fans actually use ("Nahuel
    // Molina"), not the legal name on the event ("Nahuel Molina Lucero").
    // Never shorten these by hand: Spanish names put the paternal surname
    // second-to-last, so "first + last token" yields "Nahuel Lucero".
    const [events, lineups] = await Promise.all([
      getJSON(`${BASE}/events/${id}.json`),
      getJSON(`${BASE}/lineups/${id}.json`).catch(() => []),
    ]);
    const nick = new Map();
    for (const t of lineups) {
      for (const p of t.lineup ?? []) nick.set(p.player_id, p.player_nickname || p.player_name);
    }
    const info = minfo.get(id) ?? {};

    for (const e of events) {
      if (e.type?.name !== "Shot" || e.shot?.outcome?.name !== "Goal") continue;
      // Period 5 is the penalty shootout. Those kicks are not goals — they don't
      // change the score, and they'd pile identical spot-kick trajectories into
      // the galaxy. (Excluding them takes 2022 from 195 to the real 169.)
      if (e.period === 5) continue;
      const loc = e.location;
      const end = e.shot.end_location;
      if (!loc || !end) continue;
      const team = e.team?.name ?? null;
      const opponent = team === info.home ? info.away : team === info.away ? info.home : null;
      goals.push({
        t: tournamentId,
        // where the ball crossed the goal line (m): lateral, height
        tx: +((end[1] - 40) * YARD).toFixed(3),
        ty: +((end[2] ?? 0) * YARD).toFixed(3),
        // where it was struck (m): lateral, depth into the pitch
        ox: +((loc[1] - 40) * YARD).toFixed(3),
        oz: +((120 - loc[0]) * YARD).toFixed(3),
        xg: e.shot.statsbomb_xg != null ? +e.shot.statsbomb_xg.toFixed(3) : null,
        player: nick.get(e.player?.id) ?? e.player?.name ?? null,
        team,
        opponent,
        stage: info.stage ?? null,
        minute: e.minute ?? null,
        season: info.season || null,
        pen: e.shot.type?.name === "Penalty",
      });
    }
  });
}

async function main() {
  const goals = [];
  const meta = [];

  for (const t of TOURNAMENTS) {
    const before = goals.length;
    console.log(`\n${t.label} — ${t.parts.length} season(s)…`);
    for (const [comp, season] of t.parts) {
      await bakePart(comp, season, t.id, goals);
      console.log(`  ${comp}/${season} → running total ${goals.length}`);
    }
    const count = goals.length - before;
    meta.push({ id: t.id, label: t.label, short: t.short, full: t.full, count });
    console.log(`  ✓ ${t.label}: ${count} goals`);
  }

  await mkdir(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, "goals.json");
  await writeFile(file, JSON.stringify({ source: "StatsBomb Open Data", tournaments: meta, count: goals.length, goals }));
  console.log(`\n✓ Baked ${goals.length} goals across ${meta.length} tournaments → ${file}`);
  console.table(meta.map((m) => ({ tournament: m.label, goals: m.count, complete: m.full })));
}

main().catch((e) => {
  console.error("Bake failed:", e);
  process.exit(1);
});
