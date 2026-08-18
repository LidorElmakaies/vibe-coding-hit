"use client";

import styles from "./console.module.css";
import AgentPanel from "./AgentPanel";
import type { AgentConfigDTO, AgentRole, AgentRunState, SaveState } from "./types";

interface AgentPanelGroupProps {
  heading: string;
  roles: AgentRole[];
  configs: Record<string, AgentConfigDTO | null>;
  configUnavailable: boolean;
  runStates: Record<string, AgentRunState>;
  saveStates: Record<string, SaveState>;
  disabled: boolean;
  onChange: (role: AgentRole, patch: Partial<Omit<AgentConfigDTO, "role">>) => void;
  onSave: (role: AgentRole) => void;
}

/**
 * Hierarchy item 3 (docs/interface-brief-console.md §2): panels grouped by role (defense /
 * prosecution / judges) so the pipeline's shape is visible at a glance, not one flat list of 7
 * identical-looking boxes.
 */
export default function AgentPanelGroup({
  heading,
  roles,
  configs,
  configUnavailable,
  runStates,
  saveStates,
  disabled,
  onChange,
  onSave,
}: AgentPanelGroupProps) {
  return (
    <>
      <div className={styles.panelGroupHeading}>{heading}</div>
      <div className={styles.panelsGrid}>
        {roles.map((role) => (
          <AgentPanel
            key={role}
            role={role}
            config={configs[role] ?? null}
            configUnavailable={configUnavailable}
            runState={
              runStates[role] ?? { status: configUnavailable ? "config-unavailable" : "loading-config", streamedText: "" }
            }
            saveState={saveStates[role] ?? { state: "idle" }}
            disabled={disabled}
            onChange={(patch) => onChange(role, patch)}
            onSave={() => onSave(role)}
          />
        ))}
      </div>
    </>
  );
}
