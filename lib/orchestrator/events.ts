// The SSE event wire protocol streamed by POST /api/run. Mirrors the `RunEvent` union the
// frontend already built its parser against in components/console/api.ts — kept as a separate,
// backend-owned copy (no shared package between app/api and components/) but must stay in sync by
// hand; see this agent's status report for confirmation of this exact shape with the frontend
// agent.

import type { AgentRole } from "../constants";

export type RunEvent =
  | { type: "agent-status"; role: AgentRole; status: "running" }
  | { type: "agent-delta"; role: AgentRole; textDelta: string }
  | {
      type: "agent-done";
      role: AgentRole;
      output: string;
      judgeResult?: { verdict: string; reasons: string[] };
    }
  | { type: "agent-failed"; role: AgentRole; errorMessage: string }
  | { type: "summary"; totalCostUsd: number; totalTokens: number; totalTimeMs: number }
  | { type: "run-done" }
  | { type: "run-failed"; errorMessage: string };

/** Frames one RunEvent as an SSE `data: {...}\n\n` chunk, encoded to bytes. */
export function encodeSseEvent(event: RunEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}
