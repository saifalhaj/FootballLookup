# Nightmatch — Football Player Lookup

Type a footballer's name, get a floodlit profile card: bio, club, position-aware
season stats, and transfer history. Next.js App Router, deployable to Vercel with
zero extra config. The football API key is read only on the server — it never
reaches the browser.

## Setup

1. Get a free **API-Football** key at <https://dashboard.api-football.com>.
2. Copy the example env file and paste your key:

   ```bash
   cp .env.example .env.local
   # then edit .env.local: API_FOOTBALL_KEY=xxxxxxxx
   ```

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

   Open <http://localhost:3000>.

## Deploy (Vercel)

Push the repo and import it on Vercel. Add one Environment Variable:

- `API_FOOTBALL_KEY` — your key (required)

Optional overrides:

- `API_FOOTBALL_HOST` — set to `api-football-v1.p.rapidapi.com` if you access
  API-Football through the RapidAPI gateway instead of direct api-sports.io.
  The app switches to RapidAPI auth headers automatically.
- `API_FOOTBALL_SEASON` — season year for stats (defaults to `2023`, which has
  broad free-tier coverage; the app falls back to the previous season if empty).

No database is needed to run.

## How it works

```
Browser ──▶ /api/players/search?q=   ──▶ provider.search()   ──▶ API-Football
Browser ──▶ /api/players/[id]        ──▶ provider.getProfile ──▶ API-Football
```

- **Search** hits `players/profiles` (name search, no season needed) and returns
  a short pick-list so you choose the right player.
- **Profile** merges the bio with one season of statistics and the transfer
  history, normalized into provider-agnostic types.

### Position-aware stats

The card detects the player's role and headlines the stats that matter, on a
scoreboard strip; everything else drops to a de-emphasized "full numbers" grid.

| Role | Headline stats |
| --- | --- |
| Goalkeeper | Saves · Goals conceded · Penalties saved · Appearances |
| Defender | Tackles · Interceptions · Blocks · Duels won |
| Midfielder | Key passes · Assists · Pass accuracy · Dribbles |
| Forward | Goals · Assists · Shots on target · Dribbles |

Season counting stats are summed across all competitions (league + cups); rates
like rating and pass accuracy come from the player's main competition.

### Swapping / adding a data provider

Everything the UI sees is defined in [`lib/providers/types.ts`](lib/providers/types.ts).
A second source (e.g. **SportMonks** for market value + advanced ratings, or
**FBref**) implements the `Provider` interface and is selected in
[`lib/providers/index.ts`](lib/providers/index.ts) — no component changes.

Market value is **not** exposed by API-Football, so it's shown as a clearly
labeled placeholder rather than faked. Do not scrape Transfermarkt; add a paid
provider instead.

## Guardrails

- **Rate limiting:** a simple per-IP fixed-window cap on the API routes
  ([`lib/ratelimit.ts`](lib/ratelimit.ts)) so a demo can't burn the quota. It's
  in-memory per instance — swap for Upstash/Vercel KV for a global cap.
- **Caching:** upstream calls are cached 30 min via Next's data cache to protect
  the quota. Identical lookups don't re-hit the API.
- **Errors & empties:** no-results and API errors surface as in-UI messages, not
  blank screens. Missing keys tell you exactly what to configure.
- **Never commit keys:** `.env*.local` is gitignored.

## Optional: Supabase caching

Not built (kept out of v1). To add: cache each fetched profile in a Supabase
table keyed by player id + timestamp, serve from cache when fresh (< 24h), and
put it behind an env flag so the app still runs fully without Supabase.

## Tests

The one piece of real logic — collapsing multi-competition stats into a season
line — has a self-check:

```bash
npx --yes tsx lib/providers/aggregate.test.ts
```

## Out of scope (v1)

Live match tracking, multi-season comparison, head-to-head. The provider layer
and types leave room to add them later.
