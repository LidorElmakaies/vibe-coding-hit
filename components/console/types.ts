// Shared types for the Console page (docs/interface-brief-console.md).
//
// IMPORTANT: `app/api/**` belongs to the backend agent and does not exist yet as of this build.
// Everything below marked PROVISIONAL is this agent's best-effort proposal for what the API needs
// to return, not a confirmed contract — it must be checked against backend's actual routes before
// being treated as final. Nothing here holds a secret: no OpenRouter key, no fabricated system
// prompt text. Prompt text always comes from the backend's config response; this file never
// invents or hardcodes any teacher-provided prompt content.

export type AgentRole =
  | "defense-1"
  | "defense-2"
  | "prosecution-1"
  | "prosecution-2"
  | "judge-1"
  | "judge-2"
  | "judge-3";

export const ADVOCATE_ROLES: AgentRole[] = [
  "defense-1",
  "defense-2",
  "prosecution-1",
  "prosecution-2",
];

export const JUDGE_ROLES: AgentRole[] = ["judge-1", "judge-2", "judge-3"];

export const ALL_ROLES: AgentRole[] = [...ADVOCATE_ROLES, ...JUDGE_ROLES];

export function roleGroup(role: AgentRole): "defense" | "prosecution" | "judge" {
  if (role.startsWith("defense")) return "defense";
  if (role.startsWith("prosecution")) return "prosecution";
  return "judge";
}

export function roleLabel(role: AgentRole): string {
  const [kind, n] = role.split("-");
  return `${kind.charAt(0).toUpperCase()}${kind.slice(1)} ${n}`;
}

// PROVISIONAL — one row per agent, as expected from GET /api/agent-config.
export interface AgentConfigDTO {
  role: AgentRole;
  model: string;
  systemPrompt: string;
  maxTokens: number;
}

// The curated model list, from GET /api/models — confirmed against the real route
// (app/api/models/route.ts → lib/constants.ts's CURATED_MODELS): a flat array of OpenRouter model
// ids, e.g. "openai/gpt-4o-mini" — no separate display label. Deliberately a small curated set,
// not OpenRouter's full catalog, per docs/interface-brief-console.md §2a. Never hardcoded
// client-side — always fetched, so the curated set stays backend's single source of truth.
export type ModelId = string;

export type ModelSelectionMode = "single" | "random";

export type PanelStatus =
  | "loading-config" // fetching current config, before anything is editable
  | "config-unavailable" // GET failed — never fabricate a default prompt/model in its place
  | "idle" // config loaded, no run in progress
  | "blocked-empty-prompt" // prompt field is empty; this slot cannot run
  | "running" // call in flight / streaming
  | "done"
  | "failed";

export interface JudgeResult {
  verdict: string;
  reasons: string[];
}

export interface AgentRunState {
  status: PanelStatus;
  streamedText: string; // accumulates as output streams in; final text once done
  errorMessage?: string;
  judgeResult?: JudgeResult; // only ever set for judge-* roles, once status === "done"
}

export interface SaveState {
  state: "idle" | "saving" | "saved" | "failed";
  message?: string;
}

// PROVISIONAL — run summary once a run completes.
export interface RunSummary {
  totalCostUsd: number;
  totalTokens: number;
  totalTimeMs: number;
}

// One row in the past-runs history panel, from GET /api/cases. Confirmed with backend
// (2026-08-17): only these 3 terminal statuses are ever returned — a still-running case is
// excluded from this list entirely and simply appears once it finishes. The Console doesn't need
// to (and shouldn't) render a "running" row here as a result.
export interface PastRunSummary {
  id: string;
  defendant: string;
  act: string;
  submittedAt: string; // ISO timestamp
  status: "complete" | "partial-failure" | "failed";
}

// PROVISIONAL — full detail for re-opening a past run, from GET /api/cases/:id.
export interface PastRunAgentDetail {
  role: AgentRole;
  model: string;
  systemPrompt: string;
  maxTokens: number;
  output: string | null;
  failed: boolean;
  judgeResult?: JudgeResult;
}

export interface PastRunDetail extends PastRunSummary {
  question: string;
  caseText: string;
  agents: PastRunAgentDetail[];
  summary: RunSummary | null;
}
