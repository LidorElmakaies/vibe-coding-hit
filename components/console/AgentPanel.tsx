"use client";

import { useState } from "react";
import styles from "./console.module.css";
import type { AgentConfigDTO, AgentRole, AgentRunState, SaveState } from "./types";
import { roleLabel } from "./types";

interface AgentPanelProps {
  role: AgentRole;
  config: AgentConfigDTO | null; // null while loading / if config fetch failed
  configUnavailable: boolean;
  runState: AgentRunState;
  saveState: SaveState;
  disabled: boolean; // true while a run is in progress (config becomes read-only mid-run)
  onChange: (patch: Partial<Omit<AgentConfigDTO, "role">>) => void;
  onSave: () => void;
}

const STATUS_LABEL: Record<AgentRunState["status"], string> = {
  "loading-config": "Loading…",
  "config-unavailable": "Config unavailable",
  idle: "Idle",
  "blocked-empty-prompt": "Blocked — empty prompt",
  running: "Running…",
  done: "Done",
  failed: "Failed",
};

const STATUS_CLASS: Record<AgentRunState["status"], string> = {
  "loading-config": styles.statusLoading,
  "config-unavailable": styles.statusUnavailable,
  idle: styles.statusIdle,
  "blocked-empty-prompt": styles.statusBlocked,
  running: styles.statusRunning,
  done: styles.statusDone,
  failed: styles.statusFailed,
};

export default function AgentPanel({
  role,
  config,
  configUnavailable,
  runState,
  saveState,
  disabled,
  onChange,
  onSave,
}: AgentPanelProps) {
  const [localTouched, setLocalTouched] = useState(false);

  const badgeClass = `${styles.statusBadge} ${STATUS_CLASS[runState.status]}`;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h4>{roleLabel(role)}</h4>
        <span className={badgeClass}>{STATUS_LABEL[runState.status]}</span>
      </div>

      {config && (
        <div className={styles.modelReadout}>
          Model: {config.model || "(not set)"}
        </div>
      )}

      {configUnavailable ? (
        <p className={styles.errorNote}>
          Could not load this agent&apos;s configuration from the server. Nothing is shown in its
          place — editing and running are disabled until this loads successfully.
        </p>
      ) : !config ? (
        <p className={styles.mutedNote}>Loading configuration…</p>
      ) : (
        <>
          <div className={styles.panelField}>
            <label htmlFor={`${role}-prompt`}>System prompt</label>
            <textarea
              id={`${role}-prompt`}
              value={config.systemPrompt}
              disabled={disabled}
              onChange={(e) => {
                setLocalTouched(true);
                onChange({ systemPrompt: e.target.value });
              }}
            />
          </div>

          <div className={styles.panelField}>
            <label htmlFor={`${role}-maxtokens`}>Max output tokens</label>
            <input
              id={`${role}-maxtokens`}
              type="number"
              min={1}
              value={config.maxTokens}
              disabled={disabled}
              onChange={(e) => {
                setLocalTouched(true);
                onChange({ maxTokens: Number(e.target.value) || 0 });
              }}
            />
          </div>

          <div className={styles.saveRow}>
            <button
              type="button"
              className={styles.saveButton}
              disabled={disabled || saveState.state === "saving"}
              onClick={() => {
                setLocalTouched(false);
                onSave();
              }}
            >
              {saveState.state === "saving" ? "Saving…" : "Save"}
            </button>
            <SaveIndicator saveState={saveState} localTouched={localTouched} />
          </div>

          <OutputBox runState={runState} />
        </>
      )}
    </div>
  );
}

function SaveIndicator({
  saveState,
  localTouched,
}: {
  saveState: SaveState;
  localTouched: boolean;
}) {
  if (localTouched && saveState.state !== "saving") {
    return <span className={styles.saveState}>Unsaved changes</span>;
  }
  if (saveState.state === "saving") {
    return <span className={`${styles.saveState} ${styles.saveStateSaving}`}>Saving…</span>;
  }
  if (saveState.state === "saved") {
    return <span className={`${styles.saveState} ${styles.saveStateSaved}`}>Saved</span>;
  }
  if (saveState.state === "failed") {
    return (
      <span className={`${styles.saveState} ${styles.saveStateFailed}`}>
        Save failed{saveState.message ? `: ${saveState.message}` : ""} — not persisted
      </span>
    );
  }
  return null;
}

function OutputBox({ runState }: { runState: AgentRunState }) {
  if (runState.status === "failed") {
    return (
      <div className={`${styles.outputBox} ${styles.outputBoxFailed}`}>
        Call failed{runState.errorMessage ? `: ${runState.errorMessage}` : "."} This is not a
        real output — the pipeline continues for the other agents.
      </div>
    );
  }
  if (runState.status === "blocked-empty-prompt") {
    return (
      <div className={styles.outputBox}>
        This slot was not called — its system prompt was empty at run time.
      </div>
    );
  }
  if (runState.status === "running") {
    return (
      <div className={`${styles.outputBox} ${styles.outputBoxRunning}`}>
        {runState.streamedText || "Thinking…"}
      </div>
    );
  }
  if (runState.status === "done") {
    return <div className={styles.outputBox}>{runState.streamedText}</div>;
  }
  return <div className={`${styles.outputBox} ${styles.outputEmpty}`}>No output yet.</div>;
}
