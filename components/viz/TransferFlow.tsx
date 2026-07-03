"use client";

import type { Transfer } from "@/lib/providers/types";
import { parseFee } from "@/lib/viz";
import s from "./viz.module.css";
import type { CSSProperties } from "react";

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = "hidden";
};

/** Career timeline: fee bars scaled to the biggest move, loans/frees as chips. */
export default function TransferFlow({ transfers }: { transfers: Transfer[] }) {
  const parsed = transfers.map((t) => ({ ...t, fee: parseFee(t.type) }));
  const maxFee = Math.max(0, ...parsed.map((p) => p.fee.amount ?? 0));
  // Bars only compare like with like: mixed currencies fall back to chips.
  const currencies = new Set(
    parsed.filter((p) => p.fee.amount != null && p.fee.currency).map((p) => p.fee.currency),
  );
  const comparable = currencies.size <= 1;

  return (
    <ol className={s.flow}>
      {parsed.map((t, i) => (
        <li
          key={`${t.date}-${i}`}
          className={s.flowItem}
          style={{ transitionDelay: `${Math.min(i * 70, 500)}ms` }}
        >
          <span className={s.flowYear}>{t.date?.slice(0, 4) || "—"}</span>
          <span className={s.flowRoute}>
            <span className={s.flowClub}>
              {t.fromLogo && <img src={t.fromLogo} alt="" loading="lazy" onError={hideOnError} />}
              {t.from || "—"}
            </span>
            <span className={s.flowArrow} aria-hidden>
              →
            </span>
            <span className={s.flowClub}>
              {t.toLogo && <img src={t.toLogo} alt="" loading="lazy" onError={hideOnError} />}
              {t.to || "—"}
            </span>
          </span>
          {t.fee.amount != null && maxFee > 0 && comparable ? (
            <span className={s.feeTrack}>
              <span
                className={s.feeBar}
                style={{ "--w": `${Math.max(3, (t.fee.amount / maxFee) * 100)}%` } as CSSProperties}
              />
              <span className={s.feeLabel}>{t.fee.label}</span>
            </span>
          ) : (
            <span className={s.feeKind}>{t.fee.label}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
