"use client";

import styles from "./console.module.css";
import type { PastRunSummary } from "./types";

interface PastRunsPanelProps {
  runs: PastRunSummary[] | null; // null = loading
  loadError: string | null;
  onOpen: (id: string) => void;
}

const STATUS_LABEL: Record<PastRunSummary["status"], string> = {
  complete: "Complete",
  "partial-failure": "Partial failure",
  failed: "Failed",
};

const STATUS_CLASS: Record<PastRunSummary["status"], string> = {
  complete: styles.historyStatusComplete,
  "partial-failure": styles.historyStatusPartial,
  failed: styles.historyStatusFailed,
};

/**
 * The "past cases" capability (docs/framing.md §2/§4), kept as a lightweight panel on this same
 * page per docs/interface-brief-console.md §1 item 7 rather than a separate route.
 */
export default function PastRunsPanel({ runs, loadError, onOpen }: PastRunsPanelProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionTitle}>Past runs</div>
      {loadError ? (
        <p className={styles.errorNote}>Couldn&apos;t load past runs: {loadError}</p>
      ) : runs === null ? (
        <p className={styles.mutedNote}>Loading past runs…</p>
      ) : runs.length === 0 ? (
        <p className={styles.mutedNote}>No runs yet.</p>
      ) : (
        <div className={styles.historyList}>
          {runs.map((run) => (
            <button
              key={run.id}
              type="button"
              className={styles.historyItem}
              onClick={() => onOpen(run.id)}
            >
              <span>
                {run.defendant} — {run.act}
                <br />
                <span className={styles.mutedNote}>
                  {new Date(run.submittedAt).toLocaleString()}
                </span>
              </span>
              <span className={`${styles.historyStatus} ${STATUS_CLASS[run.status]}`}>
                {STATUS_LABEL[run.status]}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
