"use client";

import styles from "./console.module.css";

interface CaseInputSectionProps {
  caseText: string;
  onChangeCaseText: (text: string) => void;
  disabled: boolean; // true while a run is in progress, or viewing a past run
}

/**
 * Hierarchy item 1 (docs/interface-brief-console.md §2, revised 2026-08-18): case input at the
 * top — the thing filled in first. The Run button itself lives in RunControl, further down (item
 * 3), after the 7 agent panels — kept as a separate component so ordering matches the brief
 * exactly rather than bundling input+action together the way the pre-revision layout did.
 */
export default function CaseInputSection({
  caseText,
  onChangeCaseText,
  disabled,
}: CaseInputSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionTitle}>Charge sheet</div>
      <div className={styles.controlBar}>
        <textarea
          className={styles.caseTextarea}
          placeholder="Defendant, act, and the exact question for the Tribunal to decide…"
          value={caseText}
          disabled={disabled}
          onChange={(e) => onChangeCaseText(e.target.value)}
        />
      </div>
    </section>
  );
}
