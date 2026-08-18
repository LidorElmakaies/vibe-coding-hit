// Shared constants for the backend: agent roles, the hard token/retry caps from
// docs/cost-budget.md, and the seeded default model. Mirrors the role list the frontend already
// defined in components/console/types.ts (ADVOCATE_ROLES / JUDGE_ROLES / ALL_ROLES) — kept as a
// separate backend-owned copy rather than a cross-package import, since app/api and components/
// are owned by different agents and this project deliberately has no shared "common" package.

export type AgentRole =
  | "defense-1"
  | "defense-2"
  | "prosecution-1"
  | "prosecution-2"
  | "judge-1"
  | "judge-2"
  | "judge-3";

export const ADVOCATE_ROLES: readonly AgentRole[] = [
  "defense-1",
  "defense-2",
  "prosecution-1",
  "prosecution-2",
];

export const JUDGE_ROLES: readonly AgentRole[] = ["judge-1", "judge-2", "judge-3"];

export const ALL_ROLES: readonly AgentRole[] = [...ADVOCATE_ROLES, ...JUDGE_ROLES];

export function isAgentRole(value: string): value is AgentRole {
  return (ALL_ROLES as string[]).includes(value);
}

export function roleKind(role: AgentRole): "advocate" | "judge" {
  return JUDGE_ROLES.includes(role) ? "judge" : "advocate";
}

export function stanceOf(role: AgentRole): "defense" | "prosecution" | null {
  if (role.startsWith("defense")) return "defense";
  if (role.startsWith("prosecution")) return "prosecution";
  return null;
}

// ---- docs/cost-budget.md §2: hard max_tokens ceiling, per role kind ----
// This is a HARD cap enforced server-side on every OpenRouter call, regardless of what value is
// stored in agent_config or sent in a run request — see docs/cost-budget.md §2 ("an editable
// token-limit field is a UI convenience, not license to remove the hard ceiling"). The soft
// length instruction (lib/orchestrator/bundle.ts) is a *different* mechanism that works alongside
// this, not instead of it.
export const HARD_MAX_TOKENS: Record<"advocate" | "judge", number> = {
  advocate: 1300,
  judge: 700,
};

// Seeded/default max_tokens per role kind (same numbers as the hard cap today, but a distinct
// constant because a future default could reasonably sit below the ceiling).
export const DEFAULT_MAX_TOKENS: Record<"advocate" | "judge", number> = {
  advocate: 1300,
  judge: 700,
};

// docs/cost-budget.md §2a: the soft length instruction's target, in tokens, added to the *user*
// message we construct — never the system prompt.
export const SOFT_LENGTH_TARGET: Record<"advocate" | "judge", number> = {
  advocate: 1000,
  judge: 500,
};

export function hardMaxTokensFor(role: AgentRole): number {
  return HARD_MAX_TOKENS[roleKind(role)];
}

export function clampMaxTokens(role: AgentRole, requested: number): number {
  const cap = hardMaxTokensFor(role);
  if (!Number.isFinite(requested) || requested <= 0) return cap;
  return Math.min(Math.trunc(requested), cap);
}

// ---- docs/cost-budget.md §5: the 21-call blast-radius ceiling ----
export const MAX_ATTEMPTS_PER_CALL = 3; // 1 initial + 2 retries
export const MAX_CALLS_PER_RUN = 21; // 7 base calls × up to 3 attempts each

// Seed default model — no model has been chosen as *the* project default (open question,
// CLAUDE.md §6); this is a reasonably inexpensive, broadly-available OpenRouter model id used only
// as the agent_config seed's starting value. Editable per agent via the Console (ADR-0014).
export const DEFAULT_MODEL = "openai/gpt-4o-mini";

// ---- docs/interface-brief-console.md §2a: the curated model list for the Console's dropdown(s) ----
// Deliberately a small, fixed set rather than OpenRouter's full catalog (hundreds of models) — the
// dropdown is meant to be scannable, not a search box. Exposed read-only via GET /api/models
// (app/api/models/route.ts). This is `main`'s starting list (2026-08-18), checked here against
// OpenRouter's live `/api/v1/models` catalog on the same day — two of the originally proposed ids
// were already deprecated/removed and swapped for a current equivalent from the same
// provider/tier, everything else in the original list was still live as-is:
//   - `anthropic/claude-3.5-sonnet` → not in OpenRouter's current catalog (superseded by several
//     Sonnet generations since) → replaced with `anthropic/claude-sonnet-4.5`.
//   - `google/gemini-flash-1.5` → not in OpenRouter's current catalog (superseded by several
//     Gemini Flash generations since) → replaced with `google/gemini-2.5-flash`.
// Revisit this list periodically — OpenRouter deprecates/adds models over time and nothing here
// guards against a curated id silently going stale between checks.
export const CURATED_MODELS: readonly string[] = [
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-3-haiku",
  "google/gemini-2.5-flash",
  "meta-llama/llama-3.1-70b-instruct",
  "mistralai/mistral-large",
];
