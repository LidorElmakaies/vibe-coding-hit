"use client";

import styles from "./console.module.css";

interface RunControlProps {
  onRun: () => void;
  runDisabled: boolean;
  running: boolean;
  blockReason: string | null;
}

/**
 * Hierarchy item 3 (docs/interface-brief-console.md §2, revised 2026-08-18): the Run control, on
 * its own, after case input (item 1) and the 7 agent panels (item 2) — configure, then run.
 */
export default function RunControl({ onRun, runDisabled, running, blockReason }: RunControlProps) {
  return (
    <section className={styles.section}>
      <div className={styles.controlRow}>
        <button type="button" className={styles.runButton} disabled={runDisabled} onClick={onRun}>
          {running ? "Running…" : "Run"}
        </button>
        {blockReason && <span className={styles.blockReason}>{blockReason}</span>}
      </div>
    </section>
  );
}
