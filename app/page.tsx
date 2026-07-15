"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GoalGalaxy, { type Goal } from "@/components/GoalGalaxy";
import { computeHighlights, describe, flagOf, nameOf, rarityTag } from "@/lib/fans";

type Payload = { source: string; tournaments: string[]; count: number; goals: Goal[] };

export default function Home() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState(0); // index into the highlights list
  const [playing, setPlaying] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch("data/goals.json")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Couldn't load the goals data."));
  }, []);

  const goals = data?.goals ?? [];
  const highlights = useMemo(() => (goals.length ? computeHighlights(goals) : []), [goals]);
  const allSet = useMemo(() => new Set(goals.map((_, i) => i)), [goals]);
  const tourSet = useMemo(() => new Set(highlights), [highlights]);

  const focusId = showAll || !highlights.length ? null : highlights[pos % highlights.length];

  // Auto-advance the tour.
  useEffect(() => {
    if (showAll || !playing || highlights.length === 0) return;
    const id = setInterval(() => setPos((p) => (p + 1) % highlights.length), 4600);
    return () => clearInterval(id);
  }, [showAll, playing, highlights.length]);

  const step = useCallback(
    (delta: number) => {
      if (!highlights.length) return;
      setPlaying(false);
      setPos((p) => (p + delta + highlights.length) % highlights.length);
    },
    [highlights.length],
  );

  const focus = focusId != null ? goals[focusId] : null;
  const tag = focus ? rarityTag(focus) : null;

  return (
    <main>
      {data && (
        <GoalGalaxy
          goals={goals}
          highlights={showAll ? allSet : tourSet}
          focusId={focusId}
        />
      )}

      <div className="overlay">
        <header className="masthead">
          <p className="eyebrow">FIFA World Cup 2022 · Greatest goals</p>
          <h1 className="title">
            Goal<br />
            <span className="lit">Galaxy</span>
          </h1>
          <p className="sub">
            Every goal of the tournament, flying into the exact corner it hit.
            A tour of the <b>most spectacular</b> ones.
          </p>
        </header>

        <button
          className="toggle"
          type="button"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "‹ Back to the tour" : "See all 195 goals →"}
        </button>

        <div className="legend">
          <span>tap-in</span>
          <span className="ramp" aria-hidden="true" />
          <span>wonder&nbsp;goal</span>
        </div>

        {/* Fan-facing card for the focused goal */}
        {focus && !showAll && (
          <div className="card" aria-live="polite">
            <span className="card-flag" aria-hidden="true">{flagOf(focus.team)}</span>
            <div className="card-body">
              <div className="card-row">
                <span className="card-scorer">{nameOf(focus.player)}</span>
                {tag && <span className="card-tag">{tag}</span>}
              </div>
              <div className="card-match">
                {focus.team} v {focus.opponent} · {focus.stage} · {focus.minute}&prime;
              </div>
              <div className="card-desc">{describe(focus)}</div>
            </div>
            <div className="card-nav">
              <button type="button" onClick={() => step(-1)} aria-label="Previous goal">‹</button>
              <span className="card-count">{(pos % highlights.length) + 1} / {highlights.length}</span>
              <button type="button" onClick={() => step(1)} aria-label="Next goal">›</button>
              <button
                type="button"
                className="card-play"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? "❚❚" : "▶"}
              </button>
            </div>
          </div>
        )}

        {showAll && (
          <div className="allbar">
            <span className="allbar-n">195</span>
            <span className="allbar-cap">goals · every one of the 2022 World Cup</span>
          </div>
        )}

        <div className="credit">
          Data —{" "}
          <a href="https://github.com/statsbomb/open-data" target="_blank" rel="noopener noreferrer">
            StatsBomb Open Data
          </a>
        </div>
      </div>

      {!data && !error && <div className="loading">Assembling the galaxy…</div>}
      {error && <div className="loading">{error}</div>}
    </main>
  );
}
