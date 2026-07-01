import type {
  Provider,
  PlayerSummary,
  PlayerProfile,
  SeasonStats,
  StatLine,
  Transfer,
} from "./types";
import { normalizePosition, PRIMARY_STATS } from "../positions";

const DEFAULT_HOST = "v3.football.api-sports.io";

/** Thrown for any upstream problem; carries an HTTP status for the route. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

function config() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    throw new ApiError(
      "The football data service isn't configured. Add API_FOOTBALL_KEY to .env.local (see .env.example).",
      500,
    );
  }
  const host = process.env.API_FOOTBALL_HOST || DEFAULT_HOST;
  return { key, host, isRapid: host.includes("rapidapi") };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

async function call(path: string, params: Record<string, string | number>): Promise<Raw[]> {
  const { key, host, isRapid } = config();
  const url = new URL(`https://${host}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const headers: Record<string, string> = isRapid
    ? { "x-rapidapi-key": key, "x-rapidapi-host": host }
    : { "x-apisports-key": key };

  let res: Response;
  try {
    // Cache identical upstream calls for 30 min to protect the quota.
    res = await fetch(url, { headers, next: { revalidate: 1800 } });
  } catch {
    throw new ApiError("Couldn't reach the football data service. Try again.", 502);
  }

  if (res.status === 429) {
    throw new ApiError("The football data service is rate-limiting us. Try again in a moment.", 429);
  }
  if (!res.ok) {
    throw new ApiError(`The football data service returned an error (${res.status}).`, 502);
  }

  const json = (await res.json()) as Raw;

  // API-Football signals problems in `errors`: [] when fine, or an object /
  // non-empty array of messages (bad key, quota exhausted, invalid params…).
  const errs = json?.errors;
  const messages = Array.isArray(errs) ? errs : errs ? Object.values(errs) : [];
  if (messages.length) {
    const text = messages.join(" ");
    if (/quota|subscription|limit|plan/i.test(text)) {
      throw new ApiError("The football data plan's request limit has been reached.", 429);
    }
    // Log provider diagnostics server-side; don't echo them to the client.
    console.error("API-Football error:", text);
    throw new ApiError("The football data service couldn't complete that request.", 502);
  }

  return (json?.response as Raw[]) ?? [];
}

const num = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");

/** Which seasons to try for stats, newest first, capped to protect quota. */
function candidateSeasons(season?: number): number[] {
  if (season) return [season];
  const env = num(process.env.API_FOOTBALL_SEASON);
  const base = env ?? 2023; // 2023 has broad free-tier coverage
  return [base, base - 1];
}

function toSummary(p: Raw): PlayerSummary {
  return {
    id: p.id,
    name: p.name ?? [p.firstname, p.lastname].filter(Boolean).join(" "),
    firstname: p.firstname ?? undefined,
    lastname: p.lastname ?? undefined,
    age: p.age ?? null,
    nationality: p.nationality ?? undefined,
    photo: p.photo ?? undefined,
    position: normalizePosition(p.position),
  };
}

/**
 * Collapse the per-competition statistics array into one season line.
 * Counting stats are summed across competitions (a player's season goals span
 * league + cups). Rates (rating, pass accuracy) can't be summed, so they're
 * taken from the competition with the most minutes — the player's main stage.
 */
export function aggregateStats(statistics: Raw[]): SeasonStats {
  const blocks = statistics ?? [];
  const primaryBlock =
    blocks.reduce(
      (best: Raw, b: Raw) =>
        (num(b?.games?.minutes) ?? 0) > (num(best?.games?.minutes) ?? 0) ? b : best,
      blocks[0],
    ) ?? {};

  const position = normalizePosition(primaryBlock?.games?.position);

  const sum = (pick: (b: Raw) => unknown): number | null => {
    let acc: number | null = null;
    for (const b of blocks) {
      const v = num(pick(b));
      if (v != null) acc = (acc ?? 0) + v;
    }
    return acc;
  };

  // `appearences` / `commited` are the API's own spellings; we read both in case
  // they ever get fixed.
  const apps = sum((b) => b.games?.appearences ?? b.games?.appearances);
  const minutes = sum((b) => b.games?.minutes);
  const goals = sum((b) => b.goals?.total);
  const assists = sum((b) => b.goals?.assists);
  const conceded = sum((b) => b.goals?.conceded);
  const saves = sum((b) => b.goals?.saves);
  const shotsTotal = sum((b) => b.shots?.total);
  const shotsOn = sum((b) => b.shots?.on);
  const keyPasses = sum((b) => b.passes?.key);
  const passesTotal = sum((b) => b.passes?.total);
  const tackles = sum((b) => b.tackles?.total);
  const interceptions = sum((b) => b.tackles?.interceptions);
  const blocksStat = sum((b) => b.tackles?.blocks);
  const duelsTotal = sum((b) => b.duels?.total);
  const duelsWon = sum((b) => b.duels?.won);
  const dribAtt = sum((b) => b.dribbles?.attempts);
  const dribbles = sum((b) => b.dribbles?.success);
  const foulsDrawn = sum((b) => b.fouls?.drawn);
  const foulsCommitted = sum((b) => b.fouls?.committed ?? b.fouls?.commited);
  const yellow = sum((b) => b.cards?.yellow);
  // Sum red + second-yellows, but stay null when a block reports no card data
  // at all (so it renders "—" and drops from the grid, like every other stat).
  const red = sum((b) => {
    const r = num(b.cards?.red);
    const yr = num(b.cards?.yellowred);
    return r == null && yr == null ? null : (r ?? 0) + (yr ?? 0);
  });
  const penScored = sum((b) => b.penalty?.scored);
  const penMissed = sum((b) => b.penalty?.missed);
  // Only penalty.saved (keeper saves). NOT penalty.commited — that's a different
  // field (penalties conceded by fouling), not a misspelling of saved.
  const penSaved = sum((b) => b.penalty?.saved);

  // Non-additive: take from the main competition.
  const passAccuracy = num(primaryBlock?.passes?.accuracy);
  const ratingNum = num(primaryBlock?.games?.rating);
  const conversion = goals != null && shotsTotal ? (goals / shotsTotal) * 100 : null;

  const pct = (n: number | null): StatLine["value"] => (n == null ? "—" : `${Math.round(n)}%`);

  // Full catalog in display order. Percent stats are pre-formatted.
  const catalog: StatLine[] = [
    { key: "apps", label: "Appearances", raw: apps, value: apps == null ? "—" : fmtInt(apps) },
    { key: "minutes", label: "Minutes", raw: minutes, value: minutes == null ? "—" : fmtInt(minutes) },
    { key: "goals", label: "Goals", raw: goals, value: goals == null ? "—" : fmtInt(goals) },
    { key: "assists", label: "Assists", raw: assists, value: assists == null ? "—" : fmtInt(assists) },
    { key: "shotsOn", label: "Shots on target", raw: shotsOn, value: shotsOn == null ? "—" : fmtInt(shotsOn) },
    { key: "shotsTotal", label: "Shots", raw: shotsTotal, value: shotsTotal == null ? "—" : fmtInt(shotsTotal) },
    { key: "conversion", label: "Conversion", raw: conversion, value: pct(conversion) },
    { key: "keyPasses", label: "Key passes", raw: keyPasses, value: keyPasses == null ? "—" : fmtInt(keyPasses) },
    { key: "passesTotal", label: "Passes", raw: passesTotal, value: passesTotal == null ? "—" : fmtInt(passesTotal) },
    { key: "passAccuracy", label: "Pass accuracy", raw: passAccuracy, value: pct(passAccuracy) },
    { key: "tackles", label: "Tackles", raw: tackles, value: tackles == null ? "—" : fmtInt(tackles) },
    { key: "interceptions", label: "Interceptions", raw: interceptions, value: interceptions == null ? "—" : fmtInt(interceptions) },
    { key: "blocks", label: "Blocks", raw: blocksStat, value: blocksStat == null ? "—" : fmtInt(blocksStat) },
    { key: "duelsWon", label: "Duels won", raw: duelsWon, value: duelsWon == null ? "—" : fmtInt(duelsWon) },
    { key: "duelsTotal", label: "Duels", raw: duelsTotal, value: duelsTotal == null ? "—" : fmtInt(duelsTotal) },
    { key: "dribbles", label: "Dribbles", raw: dribbles, value: dribbles == null ? "—" : fmtInt(dribbles) },
    { key: "dribAtt", label: "Dribbles tried", raw: dribAtt, value: dribAtt == null ? "—" : fmtInt(dribAtt) },
    { key: "saves", label: "Saves", raw: saves, value: saves == null ? "—" : fmtInt(saves) },
    { key: "conceded", label: "Goals conceded", raw: conceded, value: conceded == null ? "—" : fmtInt(conceded) },
    { key: "penSaved", label: "Penalties saved", raw: penSaved, value: penSaved == null ? "—" : fmtInt(penSaved) },
    { key: "penScored", label: "Penalties scored", raw: penScored, value: penScored == null ? "—" : fmtInt(penScored) },
    { key: "penMissed", label: "Penalties missed", raw: penMissed, value: penMissed == null ? "—" : fmtInt(penMissed) },
    { key: "foulsDrawn", label: "Fouls won", raw: foulsDrawn, value: foulsDrawn == null ? "—" : fmtInt(foulsDrawn) },
    { key: "foulsCommitted", label: "Fouls", raw: foulsCommitted, value: foulsCommitted == null ? "—" : fmtInt(foulsCommitted) },
    { key: "yellow", label: "Yellow cards", raw: yellow, value: yellow == null ? "—" : fmtInt(yellow) },
    { key: "red", label: "Red cards", raw: red, value: red == null ? "—" : fmtInt(red) },
  ];

  const byKey = new Map(catalog.map((s) => [s.key, s]));
  const primaryKeys = PRIMARY_STATS[position];
  const primary = primaryKeys
    .map((k) => byKey.get(k))
    .filter((s): s is StatLine => Boolean(s));
  const primarySet = new Set(primaryKeys);
  // Secondary: everything with actual data that isn't already a headline stat.
  const secondary = catalog.filter((s) => !primarySet.has(s.key) && s.raw != null);

  return {
    season: num(primaryBlock?.league?.season) ?? undefined,
    team: primaryBlock?.team?.name ?? undefined,
    teamLogo: primaryBlock?.team?.logo ?? undefined,
    league: primaryBlock?.league?.name ?? undefined,
    leagueLogo: primaryBlock?.league?.logo ?? undefined,
    position,
    rating: ratingNum != null ? ratingNum.toFixed(1) : null,
    number: num(primaryBlock?.games?.number),
    primary,
    secondary,
  };
}

function toTransfers(rows: Raw[]): Transfer[] {
  const list: Transfer[] = [];
  for (const row of rows) {
    for (const t of row?.transfers ?? []) {
      list.push({
        date: t?.date ?? undefined,
        type: t?.type ?? undefined,
        from: t?.teams?.out?.name ?? undefined,
        fromLogo: t?.teams?.out?.logo ?? undefined,
        to: t?.teams?.in?.name ?? undefined,
        toLogo: t?.teams?.in?.logo ?? undefined,
      });
    }
  }
  // Newest first.
  list.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return list;
}

export const apiFootball: Provider = {
  async search(query: string): Promise<PlayerSummary[]> {
    const rows = await call("players/profiles", { search: query });
    return rows
      .map((row) => toSummary(row.player ?? row))
      .filter((p) => p.id != null);
  },

  async getProfile(id: number, season?: number): Promise<PlayerProfile> {
    // Bio comes from the season-independent profile endpoint (broad coverage).
    const profileRows = await call("players/profiles", { player: id });
    const bio: Raw = profileRows[0]?.player ?? {};

    // Season stats: try newest candidate season, fall back once if empty.
    let statsRow: Raw | null = null;
    for (const s of candidateSeasons(season)) {
      const rows = await call("players", { id, season: s });
      const row = rows[0];
      if (row?.statistics?.length) {
        statsRow = row;
        break;
      }
      if (!statsRow && row) statsRow = row; // keep bio fallback from stats endpoint
    }

    const statBio: Raw = statsRow?.player ?? {};
    const stats = statsRow?.statistics?.length ? aggregateStats(statsRow.statistics) : undefined;

    const transfers = toTransfers(await call("transfers", { player: id }));

    const position =
      stats?.position && stats.position !== "Unknown"
        ? stats.position
        : normalizePosition(bio.position ?? statBio.position);

    return {
      id: bio.id ?? statBio.id ?? id,
      name: bio.name ?? statBio.name ?? [bio.firstname, bio.lastname].filter(Boolean).join(" "),
      firstname: bio.firstname ?? statBio.firstname ?? undefined,
      lastname: bio.lastname ?? statBio.lastname ?? undefined,
      age: bio.age ?? statBio.age ?? null,
      birthDate: bio.birth?.date ?? statBio.birth?.date ?? undefined,
      birthPlace: bio.birth?.place ?? statBio.birth?.place ?? undefined,
      birthCountry: bio.birth?.country ?? statBio.birth?.country ?? undefined,
      nationality: bio.nationality ?? statBio.nationality ?? undefined,
      height: bio.height ?? statBio.height ?? undefined,
      weight: bio.weight ?? statBio.weight ?? undefined,
      photo: bio.photo ?? statBio.photo ?? undefined,
      team: stats?.team,
      teamLogo: stats?.teamLogo,
      number: stats?.number ?? num(bio.number),
      position,
      stats,
      transfers,
      marketValue: null,
    };
  },
};
