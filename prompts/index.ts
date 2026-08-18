// Seed content for the 7 agent roles' system prompts, keyed by role. Consumed once, at schema-
// migration time, by lib/db/schema.ts to seed the agent_config table's default system_prompt
// value (ON CONFLICT DO NOTHING — an existing edited row is never overwritten by a reseed).
//
// Stored as TS modules (not .txt/.sql) deliberately: Next.js's standalone build output only
// reliably bundles what's reachable through the normal JS import graph, and this content needs to
// survive into the Docker "runner" stage (see Dockerfile, ADR-0013) without extra file-copy
// wiring. A plain `import` gets that for free; an `fs.readFileSync` of a sibling .txt file would
// not, without additional (devops-owned) Dockerfile changes. See this agent's status report for
// the reasoning in full.
//
// Replace each file's exported constant with the teacher's real, verbatim text once received —
// never edit prompts/placeholder.ts to "guess" at real content in the meantime.

import { placeholderPrompt, type AgentRole } from "./placeholder";

export const PROMPT_SEED: Record<AgentRole, string> = {
  "defense-1": placeholderPrompt("defense-1"),
  "defense-2": placeholderPrompt("defense-2"),
  "prosecution-1": placeholderPrompt("prosecution-1"),
  "prosecution-2": placeholderPrompt("prosecution-2"),
  "judge-1": placeholderPrompt("judge-1"),
  "judge-2": placeholderPrompt("judge-2"),
  "judge-3": placeholderPrompt("judge-3"),
};

export type { AgentRole };
