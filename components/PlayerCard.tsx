"use client";

import type { PlayerProfile } from "@/lib/providers/types";
import { POSITION_LABEL } from "@/lib/positions";
import styles from "./PlayerCard.module.css";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = "hidden";
};

export default function PlayerCard({
  profile,
  onBack,
}: {
  profile: PlayerProfile;
  onBack: () => void;
}) {
  const { stats } = profile;
  const positionLabel = POSITION_LABEL[profile.position];
  const displayName = profile.lastname || profile.name;

  const scoreboard = [
    ...(stats?.rating ? [{ key: "rating", label: "Rating", value: stats.rating }] : []),
    ...(stats?.primary ?? []).map((s) => ({ key: s.key, label: s.label, value: s.value })),
  ];

  const bio: { label: string; value: string }[] = [
    {
      label: "Born",
      value: [fmtDate(profile.birthDate), profile.age ? `(age ${profile.age})` : ""]
        .filter(Boolean)
        .join(" "),
    },
    {
      label: "Birthplace",
      value: [profile.birthPlace, profile.birthCountry].filter(Boolean).join(", ") || "—",
    },
    { label: "Nationality", value: profile.nationality || "—" },
    { label: "Height", value: profile.height || "—" },
    { label: "Weight", value: profile.weight || "—" },
  ];

  return (
    <article className={styles.card}>
      <div className={styles.glow} aria-hidden />

      {/* ---- Header ---- */}
      <header className={styles.head}>
        <div className={styles.topline}>
          <span className={styles.eyebrow}>
            {[profile.nationality, positionLabel].filter(Boolean).join("  ·  ")}
          </span>
          {profile.teamLogo && (
            <img
              className={styles.crest}
              src={profile.teamLogo}
              alt={profile.team ? `${profile.team} crest` : ""}
              onError={hideOnError}
            />
          )}
        </div>

        <div className={styles.identity}>
          <div className={styles.photo}>
            <span className={styles.photoInitials}>{initials(profile.name)}</span>
            {profile.photo && (
              <img src={profile.photo} alt={profile.name} onError={hideOnError} />
            )}
          </div>

          <div className={styles.names}>
            {profile.firstname && displayName !== profile.name && (
              <p className={styles.firstname}>{profile.firstname}</p>
            )}
            <h2 className={styles.surname}>{displayName}</h2>
            <p className={styles.club}>
              {profile.team || "Club unknown"}
              {stats?.league && <span className={styles.league}> · {stats.league}</span>}
            </p>
          </div>

          {profile.number != null && (
            <div className={styles.number} aria-label={`Jersey number ${profile.number}`}>
              <span className={styles.hash}>#</span>
              {profile.number}
            </div>
          )}
        </div>
      </header>

      {/* ---- Scoreboard (position-aware) ---- */}
      {stats ? (
        <section className={styles.scoreboard} aria-label="Key season stats">
          <p className={styles.boardLabel}>
            {stats.season ?? "Season"} · {positionLabel} · key numbers
          </p>
          <div className={styles.board}>
            {scoreboard.map((cell) => (
              <div key={cell.key} className={styles.cell}>
                <span className={styles.figure}>{cell.value}</span>
                <span className={styles.figureLabel}>{cell.label}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className={styles.noStats}>
          No season stats on record for {profile.name} yet. Bio and transfers below.
        </p>
      )}

      {/* ---- Bio ---- */}
      <section className={styles.bio}>
        {bio.map((b) => (
          <div key={b.label} className={styles.bioItem}>
            <span className={styles.bioLabel}>{b.label}</span>
            <span className={styles.bioValue}>{b.value || "—"}</span>
          </div>
        ))}
      </section>

      {/* ---- Secondary stats ---- */}
      {stats && stats.secondary.length > 0 && (
        <section className={styles.secondary}>
          <h3 className={styles.sectionHead}>
            Full season numbers
            {stats.team && <span className={styles.sectionSub}> · {stats.team} · all competitions</span>}
          </h3>
          <div className={styles.secondaryGrid}>
            {stats.secondary.map((s) => (
              <div key={s.key} className={styles.secItem}>
                <span className={styles.secValue}>{s.value}</span>
                <span className={styles.secLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- Transfers ---- */}
      <section className={styles.transfers}>
        <h3 className={styles.sectionHead}>Transfers</h3>
        {profile.transfers.length === 0 ? (
          <p className={styles.muted}>No transfer history on record.</p>
        ) : (
          <ul className={styles.timeline}>
            {profile.transfers.map((t, i) => (
              <li key={`${t.date}-${i}`} className={styles.move}>
                <span className={styles.moveYear}>{t.date?.slice(0, 4) || "—"}</span>
                <span className={styles.moveTeams}>
                  <span className={styles.team}>
                    {t.fromLogo && <img src={t.fromLogo} alt="" onError={hideOnError} />}
                    {t.from || "—"}
                  </span>
                  <span className={styles.arrow} aria-hidden>→</span>
                  <span className={styles.team}>
                    {t.toLogo && <img src={t.toLogo} alt="" onError={hideOnError} />}
                    {t.to || "—"}
                  </span>
                </span>
                {t.type && <span className={styles.fee}>{t.type}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- Market value (labeled placeholder) ---- */}
      <section className={styles.marketValue}>
        <span className={styles.mvLabel}>Market value</span>
        <span className={styles.mvValue}>Not provided by this data source</span>
      </section>

      <button type="button" className={styles.back} onClick={onBack}>
        ← New search
      </button>
    </article>
  );
}
