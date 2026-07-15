# Goal Galaxy

Every goal of the 2022 World Cup, rendered as a real 3D ballistic arc flying into
the exact corner of the net it hit — coloured by how improbable it was (xG). Zoom
out and 195 trajectories cluster into a glowing constellation.

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
