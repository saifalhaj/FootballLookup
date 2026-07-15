# Goal Galaxy

Every goal of the 2022 World Cup, rendered as a real 3D ballistic arc flying into
the exact corner of the net it hit — coloured by how improbable it was (xG). Zoom
out and 169 trajectories cluster into a glowing constellation.

It opens as a guided tour of the tournament's most spectacular goals — each with a
plain-language card (flag, scorer, opponent, round, "a 25-yard strike into the top
corner") — or filter to a single nation and watch their whole run.

Built on **[StatsBomb Open Data](https://github.com/statsbomb/open-data)**. No API
key, no backend, nothing to babysit: the goal data is baked into a static JSON file
committed to the repo, and the whole thing exports to flat files.

## How it works

```
scripts/bake.mjs  ──(one-time, over the network)──▶  public/data/goals.json
public/data/goals.json  ──(shipped as a static asset)──▶  the browser
components/GoalGalaxy.tsx  ──▶  Three.js scene (React Three Fiber + bloom)
```

Each goal's `end_location [x, y, z]` gives the true point the ball crossed the line
(top-corner screamers arc high; tap-ins skim the post), and `statsbomb_xg` drives the
colour — low-xG goals burn hot, tap-ins stay cool.

## Develop

```bash
npm install
npm run dev            # http://localhost:3000
```

## Refresh / extend the data

The goals file is already committed, so you only need this to change what's shown:

```bash
npm run bake           # men's World Cup 2022 (default)
npm run bake 2022 2018 # add more men's World Cup years
```

`bake.mjs` reads StatsBomb's `competitions.json`, pulls only the matches it needs,
extracts every shot whose outcome is a goal, converts the pitch coordinates to metres,
and writes a compact `goals.json`. It runs at build time only — never in the browser.

### What counts as a goal

The 2022 World Cup's official total is **172**. This renders **169** of them:

- **Penalty shootouts are excluded** (26 kicks). They aren't goals — they don't change
  the score — and they'd pile identical spot-kick trajectories into the galaxy.
- **Own goals are excluded** (3: Morocco 39', Germany 69', Argentina 76'). StatsBomb
  records them as `Own Goal Against` events with no shot geometry, so there's no
  trajectory to draw.

169 + 3 own goals = the official 172.

## Deploy

```bash
npm run build          # produces static ./out
```

Drop `out/` on Vercel, GitHub Pages, or Cloudflare Pages. Static output means atomic,
free deploys that can sit untouched for years.

## Attribution

Data © StatsBomb — the [Public Data User Agreement](https://github.com/statsbomb/open-data)
requires crediting StatsBomb (and, for published work, displaying their logo) and limits
use to non-commercial research/interest. The credit is shown in the app footer; add the
StatsBomb logo from their media pack before publishing anywhere public.
