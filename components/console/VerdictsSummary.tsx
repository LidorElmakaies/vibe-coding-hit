"use client";

import styles from "./console.module.css";
import { JUDGE_ROLES, roleLabel, type AgentRole, type AgentRunState } from "./types";

interface VerdictsSummaryProps {
  runStates: Record<string, AgentRunState>;
  hasRunStarted: boolean;
}

/**
 * Information hierarchy item 1 (docs/interface-brief-console.md §2): the 3 verdicts, together,
 * first — never staggered so the reader has to piece together whether the judges agreed or split.
 * Each judge's card renders independently, so one judge failing never hides the other two.
 */
export default function VerdictsSummary({ runStates, hasRunStarted }: VerdictsSummaryProps) {
  if (!hasRunStarted) {
    return (
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Verdicts</div>
        <p className={styles.verdictsEmpty}>
          No run yet — configure the agents below and press Run to get the 3 judges&apos; verdicts.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionTitle}>Verdicts</div>
      <div className={styles.verdictsGrid}>
        {JUDGE_ROLES.map((role) => {
          const state = runStates[role];
          return <VerdictCard key={role} role={role} state={state} />;
        })}
      </div>
    </section>
  );
}

function VerdictCard({ role, state }: { role: AgentRole; state: AgentRunState | undefined }) {
  const status = state?.status ?? "idle";

  if (status === "failed") {
    return (
      <div className={`${styles.verdictCard} ${styles.verdictCardFailed}`}>
        <h3>{roleLabel(role)}</h3>
        <div className={styles.verdictText}>Verdict unavailable — call failed</div>
        <p>{state?.errorMessage ?? "This judge's call did not produce a usable result."}</p>
      </div>
    );
  }

  if (status === "done" && state?.judgeResult) {
    return (
      <div className={styles.verdictCard}>
        <h3>{roleLabel(role)}</h3>
        <div className={styles.verdictText}>{state.judgeResult.verdict}</div>
        <ul>
          {state.judgeResult.reasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      </div>
    );
  }

  // The call succeeded but the judge's output didn't match the parseable "VERDICT: / REASONS:"
  // trailer format, so backend omitted judgeResult rather than guess one — per
  // audit-and-reliability, never invent a verdict here either. This is a real result, just an
  // unstructured one, so it gets its own state distinct from both a parsed verdict and a failure.
  if (status === "done") {
    return (
      <div className={`${styles.verdictCard} ${styles.verdictCardUnparsed}`}>
        <h3>{roleLabel(role)}</h3>
        <div className={styles.verdictText}>No structured verdict parsed</div>
        <p className={styles.mutedNote}>
          This judge&apos;s call succeeded but didn&apos;t match the expected verdict format — raw
          output is shown below in its panel.
        </p>
      </div>
    );
  }

  if (status === "running") {
    return (
      <div className={`${styles.verdictCard} ${styles.verdictCardPending}`}>
        <h3>{roleLabel(role)}</h3>
        <p>Deliberating…</p>
      </div>
    );
  }

  return (
    <div className={`${styles.verdictCard} ${styles.verdictCardPending}`}>
      <h3>{roleLabel(role)}</h3>
      <p>Waiting for the 4 advocates to finish.</p>
    </div>
  );
}
