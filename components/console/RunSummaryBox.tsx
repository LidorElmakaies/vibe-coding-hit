"use client";

import styles from "./console.module.css";
import type { RunSummary } from "./types";

interface RunSummaryBoxProps {
  summary: RunSummary | null;
  running: boolean;
}

/**
 * Hierarchy item 4 (docs/interface-brief-console.md §2): near the verdicts, not a headline number
 * but not buried either. Only renders once a real, run-derived summary exists — never a
 * placeholder/estimated number standing in for it (docs/cost-budget.md §6).
 */
export default function RunSummaryBox({ summary, running }: RunSummaryBoxProps) {
  if (!summary) {
    if (running) {
      return (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Run summary</div>
          <p className={styles.mutedNote}>Totals will appear once the run finishes.</p>
        </section>
      );
    }
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionTitle}>Run summary</div>
      <div className={styles.summaryBox}>
        <div className={styles.summaryStat}>
          <strong>${summary.totalCostUsd.toFixed(4)}</strong>
          total cost
        </div>
        <div className={styles.summaryStat}>
          <strong>{summary.totalTokens.toLocaleString()}</strong>
          total tokens
        </div>
        <div className={styles.summaryStat}>
          <strong>{(summary.totalTimeMs / 1000).toFixed(1)}s</strong>
          total time
        </div>
      </div>
    </section>
  );
}
