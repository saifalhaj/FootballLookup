"use client";

import type { PlayerSummary } from "@/lib/providers/types";
import { POSITION_LABEL } from "@/lib/positions";
import styles from "./ResultsList.module.css";

type Props = {
  results: PlayerSummary[];
  busy: boolean;
  query: string;
  onSelect: (id: number) => void;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ResultsList({ results, busy, query, onSelect }: Props) {
  if (busy && results.length === 0) {
    return (
      <>
        <ul className={styles.list} aria-hidden>
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className={`${styles.row} ${styles.skeleton}`} />
          ))}
        </ul>
        <span role="status" className={styles.srOnly}>
          Searching…
        </span>
      </>
    );
  }

  if (!busy && results.length === 0) {
    return (
      <p className={styles.empty}>
        No players match “<strong>{query}</strong>”. Check the spelling or try a
        surname.
      </p>
    );
  }

  return (
    <ul className={styles.list}>
      {results.map((p) => {
        const meta = [
          POSITION_LABEL[p.position],
          p.nationality,
          p.age ? `Age ${p.age}` : null,
        ]
          .filter(Boolean)
          .join("  ·  ");
        return (
          <li key={p.id}>
            <button className={styles.row} type="button" onClick={() => onSelect(p.id)}>
              <span className={styles.avatar}>
                {p.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo} alt="" loading="lazy" />
                ) : (
                  <span className={styles.initials}>{initials(p.name)}</span>
                )}
              </span>
              <span className={styles.info}>
                <span className={styles.name}>{p.name}</span>
                <span className={styles.meta}>{meta || "Player"}</span>
              </span>
              <span className={styles.chevron} aria-hidden>
                →
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
