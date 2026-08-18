"use client";

import styles from "./console.module.css";
import type { ModelId, ModelSelectionMode } from "./types";

interface ModelSelectorProps {
  models: ModelId[] | null; // null = still loading
  modelsError: string | null;
  mode: ModelSelectionMode;
  selectedModel: string; // only meaningful in "single" mode
  applyState: "idle" | "applying" | "applied" | "failed";
  applyError: string | null;
  disabled: boolean; // true while a run is in progress, or viewing a past run
  onModeChange: (mode: ModelSelectionMode) => void;
  onSelectModel: (modelId: string) => void; // picking a model IS the apply action, single mode
}

/**
 * docs/interface-brief-console.md §2a (added 2026-08-18): two modes, not per-agent free text.
 * "Single" applies one model to all 7 agents immediately on selection (PUT ×7). "Random" doesn't
 * touch config here — the re-roll happens right before Run (see app/page.tsx's handleRun), since
 * the brief specifies it's re-rolled on every Run, not on switching modes.
 */
export default function ModelSelector({
  models,
  modelsError,
  mode,
  selectedModel,
  applyState,
  applyError,
  disabled,
  onModeChange,
  onSelectModel,
}: ModelSelectorProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionTitle}>Model selection</div>
      <div className={styles.modelSelectorRow}>
        <div className={styles.modelModeToggle}>
          <button
            type="button"
            disabled={disabled}
            className={`${styles.modelModeButton} ${
              mode === "single" ? styles.modelModeButtonActive : ""
            }`}
            onClick={() => onModeChange("single")}
          >
            Single model for all
          </button>
          <button
            type="button"
            disabled={disabled}
            className={`${styles.modelModeButton} ${
              mode === "random" ? styles.modelModeButtonActive : ""
            }`}
            onClick={() => onModeChange("random")}
          >
            Random per agent
          </button>
        </div>

        {modelsError ? (
          <p className={styles.errorNote}>
            Couldn&apos;t load the curated model list: {modelsError}. Model selection is
            unavailable until this loads — each agent keeps whatever model it&apos;s currently
            configured with.
          </p>
        ) : models === null ? (
          <p className={styles.mutedNote}>Loading available models…</p>
        ) : mode === "single" ? (
          <>
            <select
              className={styles.modelDropdown}
              value={selectedModel}
              disabled={disabled}
              onChange={(e) => onSelectModel(e.target.value)}
            >
              <option value="" disabled>
                Select a model…
              </option>
              {models.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            <ApplyStatus state={applyState} error={applyError} />
          </>
        ) : (
          <p className={styles.modelNote}>
            Each of the 7 agents will get an independently random model from the curated list,
            re-rolled every time Run is pressed.
          </p>
        )}
      </div>
    </section>
  );
}

function ApplyStatus({
  state,
  error,
}: {
  state: "idle" | "applying" | "applied" | "failed";
  error: string | null;
}) {
  if (state === "applying") {
    return <span className={`${styles.modelStatus} ${styles.modelStatusApplying}`}>Applying to all 7 agents…</span>;
  }
  if (state === "applied") {
    return <span className={`${styles.modelStatus} ${styles.modelStatusApplied}`}>Applied to all 7 agents</span>;
  }
  if (state === "failed") {
    return (
      <span className={`${styles.modelStatus} ${styles.modelStatusFailed}`}>
        Failed to apply to all agents{error ? `: ${error}` : ""} — some panels may not match
      </span>
    );
  }
  return null;
}
