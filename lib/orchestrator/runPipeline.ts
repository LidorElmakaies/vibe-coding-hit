// The orchestrator — docs/architecture.md §2's two-stage request cycle: 4 advocates in parallel,
// then (once all 4 exist) 3 judges in parallel. See ADR-0007 for why parallel, not sequential
// (~6s vs. ~21s for this exact shape).

import {
  createCase,
  finalizeCase,
  insertAdvocateOutput,
  insertVerdict,
  sumRunUsage,
  type CaseStatus,
} from "../db/queries";
import { ADVOCATE_ROLES, JUDGE_ROLES, MAX_CALLS_PER_RUN, clampMaxTokens, stanceOf, type AgentRole } from "../constants";
import { buildAdvocateUserMessage, buildJudgeUserMessage, type AdvocateOutputForBundle } from "./bundle";
import { parseJudgeOutput } from "./parseJudgeOutput";
import { callAgent } from "./callAgent";
import type { RunEvent } from "./events";

export interface AgentRunConfig {
  role: AgentRole;
  model: string;
  systemPrompt: string;
  maxTokens: number;
}

export interface RunPipelineInput {
  caseText: string;
  agents: AgentRunConfig[]; // must include all 4 advocate roles; judge roles are each optional
}

/**
 * Runs the full 7-call (or fewer, if a judge slot was pre-blocked) pipeline for one case,
 * streaming RunEvents as it goes and persisting every table along the way. Never throws for an
 * individual call's failure — those surface as `agent-failed` events and a `partial-failure`/
 * `failed` case status. Only throws for something that makes the run itself impossible to persist
 * (e.g. the database is unreachable), which the caller (app/api/run) turns into `run-failed`.
 */
export async function runPipeline(input: RunPipelineInput, emit: (event: RunEvent) => void): Promise<void> {
  const caseRow = await createCase(input.caseText);
  const runStartedAt = Date.now();

  let callsIssued = 0;
  const reserveCallSlot = (): boolean => {
    if (callsIssued >= MAX_CALLS_PER_RUN) return false;
    callsIssued += 1;
    return true;
  };

  const advocateConfigs = ADVOCATE_ROLES.map((role) => input.agents.find((a) => a.role === role)).filter(
    (a): a is AgentRunConfig => a !== undefined
  );

  // ---- Stage 1: advocates, in parallel ----
  const advocateResults = await Promise.all(
    advocateConfigs.map(async (cfg) => {
      const maxTokens = clampMaxTokens(cfg.role, cfg.maxTokens);
      const userMessage = buildAdvocateUserMessage(input.caseText);
      const result = await callAgent({
        caseId: caseRow.id,
        role: cfg.role,
        callType: "advocate",
        model: cfg.model,
        systemPrompt: cfg.systemPrompt,
        userMessage,
        maxTokens,
        emit,
        reserveCallSlot,
      });

      await insertAdvocateOutput({
        caseId: caseRow.id,
        role: cfg.role,
        stance: stanceOf(cfg.role)!,
        model: cfg.model,
        systemPrompt: cfg.systemPrompt,
        maxTokens,
        output: result.output,
        failed: !result.success,
        errorMessage: result.errorMessage,
      });

      if (result.success) {
        emit({ type: "agent-done", role: cfg.role, output: result.output! });
      } else {
        emit({ type: "agent-failed", role: cfg.role, errorMessage: result.errorMessage ?? "Call failed." });
      }

      return { role: cfg.role, ...result };
    })
  );

  const advocateBundle: AdvocateOutputForBundle[] = advocateResults.map((r) => ({
    role: r.role,
    output: r.output,
    failed: !r.success,
  }));

  // ---- Stage 2: judges, in parallel — only once all 4 advocate calls have settled ----
  const judgeConfigs = JUDGE_ROLES.map((role) => input.agents.find((a) => a.role === role)).filter(
    (a): a is AgentRunConfig => a !== undefined
  );

  const judgeResults = await Promise.all(
    judgeConfigs.map(async (cfg) => {
      const maxTokens = clampMaxTokens(cfg.role, cfg.maxTokens);
      const userMessage = buildJudgeUserMessage(input.caseText, advocateBundle);
      const result = await callAgent({
        caseId: caseRow.id,
        role: cfg.role,
        callType: "judge",
        model: cfg.model,
        systemPrompt: cfg.systemPrompt,
        userMessage,
        maxTokens,
        emit,
        reserveCallSlot,
      });

      const parsed = result.success && result.output ? parseJudgeOutput(result.output) : null;

      await insertVerdict({
        caseId: caseRow.id,
        role: cfg.role,
        model: cfg.model,
        systemPrompt: cfg.systemPrompt,
        maxTokens,
        output: result.output,
        verdictLabel: parsed?.verdict ?? null,
        reasons: parsed?.reasons ?? null,
        failed: !result.success,
        errorMessage: result.errorMessage,
      });

      if (result.success) {
        emit({
          type: "agent-done",
          role: cfg.role,
          output: result.output!,
          judgeResult: parsed ?? undefined,
        });
      } else {
        emit({ type: "agent-failed", role: cfg.role, errorMessage: result.errorMessage ?? "Call failed." });
      }

      return { role: cfg.role, ...result };
    })
  );

  // ---- Finalize: genuine usage sum (docs/cost-budget.md §6), never estimated ----
  const { totalTokens, totalCostUsd } = await sumRunUsage(caseRow.id);
  const totalTimeMs = Date.now() - runStartedAt;

  const anyFailed =
    advocateResults.some((r) => !r.success) || judgeResults.some((r) => !r.success);
  const allFailed =
    advocateResults.every((r) => !r.success) && judgeResults.every((r) => !r.success);
  const status: CaseStatus = allFailed && advocateResults.length + judgeResults.length > 0
    ? "failed"
    : anyFailed
      ? "partial-failure"
      : "complete";

  await finalizeCase(caseRow.id, { status, totalTokens, totalCostUsd, totalTimeMs });

  emit({ type: "summary", totalCostUsd, totalTokens, totalTimeMs });
  emit({ type: "run-done" });
}
