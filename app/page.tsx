"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GoalGalaxy, { type Goal } from "@/components/GoalGalaxy";
import {
  computeHighlights,
  describe,
  flagOf,
  goalsForTeam,
  nameOf,
  rarityTag,
  teamsWithGoals,
} from "@/lib/fans";

type Payload = { source: string; tournaments: string[]; count: number; goals: Goal[] };

export default function Home() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [team, setTeam] = useState<string>("");

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
  const teams = useMemo(() => (goals.length ? teamsWithGoals(goals) : []), [goals]);

  // The tour is either the curated greatest goals, or one nation's whole run.
  const tour = useMemo(() => {
    if (!goals.length) return [];
    return team ? goalsForTeam(goals, team) : computeHighlights(goals);
  }, [goals, team]);

  const allSet = useMemo(() => new Set(goals.map((_, i) => i)), [goals]);
  const tourSet = useMemo(() => new Set(tour), [tour]);

  // Picking a team restarts its story and leaves the all-goals view.
  useEffect(() => {
    setPos(0);
    setShowAll(false);
  }, [team]);

  const focusId = showAll || !tour.length ? null : tour[pos % tour.length];

  useEffect(() => {
    if (showAll || !playing || tour.length === 0) return;
    const id = setInterval(() => setPos((p) => (p + 1) % tour.length), 4600);
    return () => clearInterval(id);
  }, [showAll, playing, tour.length]);

  const step = useCallback(
    (delta: number) => {
      if (!tour.length) return;
      setPlaying(false);
      setPos((p) => (p + delta + tour.length) % tour.length);
    },
    [tour.length],
  );

  // Arrow keys walk the tour; space pauses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const focus = focusId != null ? goals[focusId] : null;
  const tag = focus ? rarityTag(focus) : null;

  return (
    <main>
      {data && (
        <GoalGalaxy goals={goals} highlights={showAll ? allSet : tourSet} focusId={focusId} />
      )}

      <div className="overlay">
        <header className="masthead">
          <p className="eyebrow">FIFA World Cup 2022 · {team ? team : "Greatest goals"}</p>
          <h1 className="title">
            Goal<br />
            <span className="lit">Galaxy</span>
          </h1>
          <p className="sub">
            {team
              ? `Every goal ${team} scored, in the order they scored them.`
              : "Every strike that found the net, flying into the exact corner it hit. A tour of the most spectacular ones."}
          </p>
        </header>

        <div className="controls">
          <select
            className="picker"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            aria-label="Show one team's goals"
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {flagOf(t)} {t}
              </option>
            ))}
          </select>
          <button className="toggle" type="button" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "‹ Back to the tour" : `See all ${goals.length} goals →`}
          </button>
        </div>

        <div className="legend">
          <span>tap-in</span>
          <span className="ramp" aria-hidden="true" />
          <span>wonder&nbsp;goal</span>
        </div>

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
              <span className="card-count">{(pos % tour.length) + 1} / {tour.length}</span>
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
            <span className="allbar-n">{goals.length}</span>
            <span className="allbar-cap">goals · every shot that found the net in 2022</span>
          </div>
        )}

        <div className="credit">
          Data —{" "}
          <a href="https://github.com/statsbomb/open-data" target="_blank" rel="noopener noreferrer">
            StatsBomb Open Data
          </a>
          <br />
          Shootout penalties and the 3 own goals aren&rsquo;t shown — no shot to draw
        </div>
      </div>

      {!data && !error && <div className="loading">Assembling the galaxy…</div>}
      {error && <div className="loading">{error}</div>}
    </main>
  );
}
