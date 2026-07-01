"use client";

import styles from "./SearchBox.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  busy?: boolean;
};

export default function SearchBox({ value, onChange, busy }: Props) {
  return (
    <div className={styles.box}>
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden fill="none">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        className={styles.input}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search a player…"
        aria-label="Search for a football player"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
      />
      {busy && <span className={styles.spinner} aria-hidden />}
      {!busy && value && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
}
