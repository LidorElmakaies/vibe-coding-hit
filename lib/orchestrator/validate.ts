// Request-body validation for POST /api/run. Defense-in-depth: the Console already blocks the
// Run button client-side (docs/interface-brief-console.md), but the backend never trusts that —
// see docs/rules/security-and-permissions.md's "do less when uncertain" rule applied here as
// "reject clearly rather than guess."

import { ADVOCATE_ROLES, isAgentRole } from "../constants";
import type { AgentRunConfig } from "./runPipeline";

export interface RunRequestBody {
  caseText: unknown;
  agents: unknown;
}

export type ValidationResult =
  | { ok: true; caseText: string; agents: AgentRunConfig[] }
  | { ok: false; error: string };

export function validateRunRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const { caseText, agents } = body as RunRequestBody;

  if (typeof caseText !== "string" || !caseText.trim()) {
    return { ok: false, error: "caseText is required and must be a non-empty string." };
  }
  if (!Array.isArray(agents) || agents.length === 0) {
    return { ok: false, error: "agents must be a non-empty array." };
  }

  const seen = new Set<string>();
  const parsed: AgentRunConfig[] = [];
  for (const raw of agents) {
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, error: "Each agent entry must be an object." };
    }
    const { role, model, systemPrompt, maxTokens } = raw as Record<string, unknown>;
    if (typeof role !== "string" || !isAgentRole(role)) {
      return { ok: false, error: `Invalid or missing agent role: ${String(role)}` };
    }
    if (seen.has(role)) {
      return { ok: false, error: `Duplicate agent role in request: ${role}` };
    }
    seen.add(role);
    if (typeof model !== "string" || !model.trim()) {
      return { ok: false, error: `Agent ${role}: model is required.` };
    }
    if (typeof systemPrompt !== "string" || !systemPrompt.trim()) {
      return { ok: false, error: `Agent ${role}: systemPrompt is required (empty prompts must be blocked before submitting a run).` };
    }
    if (typeof maxTokens !== "number" || !Number.isFinite(maxTokens) || maxTokens <= 0) {
      return { ok: false, error: `Agent ${role}: maxTokens must be a positive number.` };
    }
    parsed.push({ role, model, systemPrompt, maxTokens });
  }

  const missingAdvocates = ADVOCATE_ROLES.filter((r) => !seen.has(r));
  if (missingAdvocates.length > 0) {
    return {
      ok: false,
      error:
        `All 4 advocate roles must be present with a non-empty prompt (judges need the full ` +
        `bundle) — missing: ${missingAdvocates.join(", ")}.`,
    };
  }

  return { ok: true, caseText: caseText.trim(), agents: parsed };
}
