"use client";

import type { PlayerProfile } from "@/lib/providers/types";
import { POSITION_LABEL } from "@/lib/positions";
import { radarAxes, gaugeSpecs } from "@/lib/viz";
import CountUp from "@/components/viz/CountUp";
import Reveal from "@/components/viz/Reveal";
import Radar from "@/components/viz/Radar";
import Gauge from "@/components/viz/Gauge";
import PitchMap from "@/components/viz/PitchMap";
import TransferFlow from "@/components/viz/TransferFlow";
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
  // Date-only ISO strings parse as UTC midnight; format in UTC too, or users
  // west of Greenwich see every birthdate a day early (and SSR/client drift).
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
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
    ...(stats?.rating
      ? [{ key: "rating", label: "Rating", value: stats.rating, raw: Number(stats.rating) }]
      : []),
    ...(stats?.primary ?? []),
  ];

  const axes = stats ? radarAxes(stats) : null;
  const gauges = stats ? gaugeSpecs(stats) : [];

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

      {/* ---- Scoreboard (position-aware, split-flap + count-up) ---- */}
      {stats ? (
        <Reveal as="section" className={styles.scoreboard} ariaLabel="Key season stats">
          <p className={styles.boardLabel}>
            {stats.season ?? "Season"} · {positionLabel} · key numbers
          </p>
          <div className={styles.board}>
            {scoreboard.map((cell, i) => (
              <div
                key={cell.key}
                className={styles.cell}
                style={{ transitionDelay: `${i * 65}ms` }}
              >
                <span className={styles.figure}>
                  {cell.raw != null && Number.isFinite(cell.raw) ? (
                    <CountUp
                      to={cell.raw}
                      decimals={cell.value.includes(".") ? 1 : 0}
                      suffix={cell.value.endsWith("%") ? "%" : ""}
                      delay={i * 65}
                    />
                  ) : (
                    cell.value
                  )}
                </span>
                <span className={styles.figureLabel}>{cell.label}</span>
              </div>
            ))}
          </div>
        </Reveal>
      ) : (
        <p className={styles.noStats}>
          No season stats on record for {profile.name} yet. Bio and transfers below.
        </p>
      )}

      {/* ---- Role profile: pitch zone + radar ---- */}
      {axes && (
        <Reveal as="section" className={styles.role}>
          <h3 className={styles.sectionHead}>
            Role profile
            <span className={styles.sectionSub}> · vs elite benchmark</span>
          </h3>
          <div className={styles.roleGrid}>
            <PitchMap position={profile.position} />
            <Radar axes={axes} />
          </div>
          <p className={styles.footnote}>
            Per-90 and season values from {stats?.season ?? "season"} all-competition totals;
            rating and pass accuracy from the main competition. Scaled against elite positional
            benchmarks
            {profile.position === "Goalkeeper"
              ? " · conceded axis inverted (fuller = tighter defence)"
              : ""}
            . Axes floored at 4% so zeros stay visible. Minimum 270 minutes.
          </p>
        </Reveal>
      )}

      {/* ---- Efficiency gauges ---- */}
      {gauges.length >= 2 && (
        <Reveal as="section" className={styles.efficiency}>
          <h3 className={styles.sectionHead}>Efficiency</h3>
          <div className={styles.gaugeRow}>
            {gauges.map((g) => (
              <Gauge key={g.key} label={g.label} pct={g.pct} detail={g.detail} />
            ))}
          </div>
        </Reveal>
      )}

      {/* ---- Bio ---- */}
      <Reveal as="section" className={styles.bio}>
        {bio.map((b) => (
          <div key={b.label} className={styles.bioItem}>
            <span className={styles.bioLabel}>{b.label}</span>
            <span className={styles.bioValue}>{b.value || "—"}</span>
          </div>
        ))}
      </Reveal>

      {/* ---- Secondary stats ---- */}
      {stats && stats.secondary.length > 0 && (
        <Reveal as="section" className={styles.secondary}>
          <h3 className={styles.sectionHead}>
            Full season numbers
            {stats.team && (
              <span className={styles.sectionSub}> · {stats.team} · all competitions</span>
            )}
          </h3>
          <div className={styles.secondaryGrid}>
            {stats.secondary.map((s, i) => (
              <div
                key={s.key}
                className={styles.secItem}
                style={{ transitionDelay: `${Math.min(i * 30, 420)}ms` }}
              >
                <span className={styles.secValue}>{s.value}</span>
                <span className={styles.secLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* ---- Transfers ---- */}
      <Reveal as="section" className={styles.transfers}>
        <h3 className={styles.sectionHead}>Transfers</h3>
        {profile.transfers.length === 0 ? (
          <p className={styles.muted}>No transfer history on record.</p>
        ) : (
          <TransferFlow transfers={profile.transfers} />
        )}
      </Reveal>

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
