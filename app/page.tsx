"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerSummary, PlayerProfile } from "@/lib/providers/types";
import SearchBox from "@/components/SearchBox";
import ResultsList from "@/components/ResultsList";
import PlayerCard from "@/components/PlayerCard";
import styles from "./page.module.css";

const EXAMPLES = ["Haaland", "Bellingham", "Rodri", "Vinicius"];

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);

  // Debounced live search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed. Try again.");
        setResults(data.results ?? []);
        setSearchError(null);
        setSearching(false);
      } catch (e) {
        // A superseding effect run owns `searching`; don't touch it on abort.
        if ((e as Error).name === "AbortError") return;
        setResults([]);
        setSearchError((e as Error).message);
        setSearching(false);
      }
    }, 300);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const selectPlayer = useCallback((id: number) => {
    setSelectedId(id);
    setProfile(null);
    setProfileError(null);
    setLoadingProfile(true);
    requestAnimationFrame(() =>
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
    (async () => {
      try {
        const res = await fetch(`/api/players/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't load that player.");
        setProfile(data.profile);
      } catch (e) {
        setProfileError((e as Error).message);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  const clearSelection = () => {
    setSelectedId(null);
    setProfile(null);
    setProfileError(null);
  };

  const showResults = query.trim().length >= 3 && !selectedId;

  return (
    <main className={styles.main}>
      <header className={`${styles.hero} ${selectedId ? styles.heroCompact : ""}`}>
        <p className={styles.eyebrow}>Football player lookup</p>
        <h1 className={styles.title}>
          Under the <span>floodlights</span>
        </h1>
        <p className={styles.lede}>
          Search any footballer for a matchday profile — bio, club, position-aware
          season stats, and transfer history.
        </p>

        <SearchBox
          value={query}
          onChange={(v) => {
            setQuery(v);
            if (selectedId) clearSelection();
          }}
          busy={searching}
        />

        {!query && (
          <div className={styles.examples}>
            <span className={styles.examplesLabel}>Try</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className={styles.chip}
                onClick={() => setQuery(ex)}
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </header>

      {showResults && (
        <section className={styles.resultsWrap} aria-live="polite">
          {searchError ? (
            <p className={styles.notice} role="alert">
              {searchError}
            </p>
          ) : (
            <ResultsList
              results={results}
              busy={searching}
              query={query.trim()}
              onSelect={selectPlayer}
            />
          )}
        </section>
      )}

      <div ref={cardRef} className={styles.cardSlot}>
        {selectedId &&
          (loadingProfile ? (
            <div className={styles.loading} role="status">
              <span className={styles.loadingBar} aria-hidden />
              <p>Warming up the floodlights…</p>
            </div>
          ) : profileError ? (
            <div className={styles.notice} role="alert">
              <p>{profileError}</p>
              <button
                type="button"
                className={styles.retry}
                onClick={() => selectPlayer(selectedId)}
              >
                Try again
              </button>
            </div>
          ) : profile ? (
            <PlayerCard profile={profile} onBack={clearSelection} />
          ) : null)}
      </div>
    </main>
  );
}
