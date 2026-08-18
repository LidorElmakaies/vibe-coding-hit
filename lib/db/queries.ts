// Thin query layer over MongoDB — replaces the earlier `pg`-based version (ADR-0017). Every
// exported function keeps the EXACT same name/signature/return shape as before on purpose: this
// is a persistence-layer swap only, so lib/orchestrator/** and app/api/** import this module
// without any change of their own — see ADR-0017's "orchestrator and API routes' external
// contracts are unaffected" consequence.

import { ObjectId } from "mongodb";
import {
  agentConfigsCol,
  casesCol,
  advocateOutputsCol,
  verdictsCol,
  callLogsCol,
  tryParseObjectId,
  type CaseStatus,
} from "./collections";
import type { AgentRole } from "../constants";

export type { CaseStatus };

// ---------------------------------------------------------------------------------------------
// agent_configs
// ---------------------------------------------------------------------------------------------

export interface AgentConfigRow {
  role: AgentRole;
  model: string;
  systemPrompt: string;
  maxTokens: number;
  updatedAt: string;
}

export async function listAgentConfigs(): Promise<AgentConfigRow[]> {
  const col = await agentConfigsCol();
  const docs = await col.find({}).sort({ _id: 1 }).toArray();
  return docs.map((d) => ({
    role: d._id,
    model: d.model,
    systemPrompt: d.systemPrompt,
    maxTokens: d.maxTokens,
    updatedAt: d.updatedAt.toISOString(),
  }));
}

export async function getAgentConfig(role: AgentRole): Promise<AgentConfigRow | null> {
  const col = await agentConfigsCol();
  const d = await col.findOne({ _id: role });
  if (!d) return null;
  return {
    role: d._id,
    model: d.model,
    systemPrompt: d.systemPrompt,
    maxTokens: d.maxTokens,
    updatedAt: d.updatedAt.toISOString(),
  };
}

export interface AgentConfigPatch {
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
}

export async function updateAgentConfig(
  role: AgentRole,
  patch: AgentConfigPatch
): Promise<AgentConfigRow | null> {
  const col = await agentConfigsCol();
  const $set: Partial<Pick<AgentConfigPatch, "model" | "systemPrompt" | "maxTokens">> & {
    updatedAt: Date;
  } = { updatedAt: new Date() };
  if (patch.model !== undefined) $set.model = patch.model;
  if (patch.systemPrompt !== undefined) $set.systemPrompt = patch.systemPrompt;
  if (patch.maxTokens !== undefined) $set.maxTokens = patch.maxTokens;

  const result = await col.findOneAndUpdate(
    { _id: role },
    { $set },
    { returnDocument: "after" }
  );
  if (!result) return null;
  return {
    role: result._id,
    model: result.model,
    systemPrompt: result.systemPrompt,
    maxTokens: result.maxTokens,
    updatedAt: result.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------------------------
// cases
// ---------------------------------------------------------------------------------------------

export interface CaseRow {
  id: string;
  caseText: string;
  submittedAt: string;
  status: CaseStatus;
  totalTokens: number | null;
  totalCostUsd: number | null;
  totalTimeMs: number | null;
}

export async function createCase(caseText: string): Promise<CaseRow> {
  const col = await casesCol();
  const _id = new ObjectId();
  const submittedAt = new Date();
  await col.insertOne({
    _id,
    caseText,
    submittedAt,
    status: "running",
    totalTokens: null,
    totalCostUsd: null,
    totalTimeMs: null,
  });
  return {
    id: _id.toHexString(),
    caseText,
    submittedAt: submittedAt.toISOString(),
    status: "running",
    totalTokens: null,
    totalCostUsd: null,
    totalTimeMs: null,
  };
}

export async function finalizeCase(
  caseId: string,
  fields: { status: CaseStatus; totalTokens: number; totalCostUsd: number; totalTimeMs: number }
): Promise<void> {
  const _id = tryParseObjectId(caseId);
  if (!_id) return;
  const col = await casesCol();
  await col.updateOne(
    { _id },
    {
      $set: {
        status: fields.status,
        totalTokens: fields.totalTokens,
        totalCostUsd: fields.totalCostUsd,
        totalTimeMs: fields.totalTimeMs,
      },
    }
  );
}

/**
 * Excludes cases still mid-run (status = 'running') by default — the frontend's PastRunSummary
 * type only has the 3 terminal statuses (components/console/types.ts / PastRunsPanel.tsx's
 * STATUS_LABEL map), so a still-running case simply doesn't appear in the history list yet rather
 * than being surfaced with a status the UI has no label for. It appears once finalizeCase() gives
 * it a terminal status (a run normally takes single-digit seconds — see ADR-0007).
 */
export async function listCases(limit = 50): Promise<CaseRow[]> {
  const col = await casesCol();
  const docs = await col
    .find({ status: { $ne: "running" } })
    .sort({ submittedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => ({
    id: d._id.toHexString(),
    caseText: d.caseText,
    submittedAt: d.submittedAt.toISOString(),
    status: d.status,
    totalTokens: d.totalTokens,
    totalCostUsd: d.totalCostUsd,
    totalTimeMs: d.totalTimeMs,
  }));
}

export async function getCase(id: string): Promise<CaseRow | null> {
  const _id = tryParseObjectId(id);
  if (!_id) return null;
  const col = await casesCol();
  const d = await col.findOne({ _id });
  if (!d) return null;
  return {
    id: d._id.toHexString(),
    caseText: d.caseText,
    submittedAt: d.submittedAt.toISOString(),
    status: d.status,
    totalTokens: d.totalTokens,
    totalCostUsd: d.totalCostUsd,
    totalTimeMs: d.totalTimeMs,
  };
}

// ---------------------------------------------------------------------------------------------
// advocate_outputs
// ---------------------------------------------------------------------------------------------

export interface AdvocateOutputInput {
  caseId: string;
  role: AgentRole;
  stance: "defense" | "prosecution";
  model: string;
  systemPrompt: string;
  maxTokens: number;
  output: string | null;
  failed: boolean;
  errorMessage: string | null;
}

export interface AdvocateOutputRow extends AdvocateOutputInput {
  id: string;
  createdAt: string;
}

export async function insertAdvocateOutput(input: AdvocateOutputInput): Promise<AdvocateOutputRow> {
  const col = await advocateOutputsCol();
  const caseObjectId = new ObjectId(input.caseId);
  const now = new Date();

  const result = await col.findOneAndUpdate(
    { caseId: caseObjectId, role: input.role },
    {
      $set: {
        stance: input.stance,
        model: input.model,
        systemPrompt: input.systemPrompt,
        maxTokens: input.maxTokens,
        output: input.output,
        failed: input.failed,
        errorMessage: input.errorMessage,
      },
      $setOnInsert: { _id: new ObjectId(), caseId: caseObjectId, role: input.role, createdAt: now },
    },
    { upsert: true, returnDocument: "after" }
  );
  const d = result!;
  return {
    id: d._id.toHexString(),
    caseId: d.caseId.toHexString(),
    role: d.role,
    stance: d.stance,
    model: d.model,
    systemPrompt: d.systemPrompt,
    maxTokens: d.maxTokens,
    output: d.output,
    failed: d.failed,
    errorMessage: d.errorMessage,
    createdAt: d.createdAt.toISOString(),
  };
}

export async function listAdvocateOutputs(caseId: string): Promise<AdvocateOutputRow[]> {
  const _id = tryParseObjectId(caseId);
  if (!_id) return [];
  const col = await advocateOutputsCol();
  const docs = await col.find({ caseId: _id }).sort({ role: 1 }).toArray();
  return docs.map((d) => ({
    id: d._id.toHexString(),
    caseId: d.caseId.toHexString(),
    role: d.role,
    stance: d.stance,
    model: d.model,
    systemPrompt: d.systemPrompt,
    maxTokens: d.maxTokens,
    output: d.output,
    failed: d.failed,
    errorMessage: d.errorMessage,
    createdAt: d.createdAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------------------------
// verdicts
// ---------------------------------------------------------------------------------------------

export interface VerdictInput {
  caseId: string;
  role: AgentRole;
  model: string;
  systemPrompt: string;
  maxTokens: number;
  output: string | null;
  verdictLabel: string | null;
  reasons: string[] | null;
  failed: boolean;
  errorMessage: string | null;
}

export interface VerdictRow extends VerdictInput {
  id: string;
  createdAt: string;
}

export async function insertVerdict(input: VerdictInput): Promise<VerdictRow> {
  const col = await verdictsCol();
  const caseObjectId = new ObjectId(input.caseId);
  const now = new Date();

  const result = await col.findOneAndUpdate(
    { caseId: caseObjectId, role: input.role },
    {
      $set: {
        model: input.model,
        systemPrompt: input.systemPrompt,
        maxTokens: input.maxTokens,
        output: input.output,
        verdictLabel: input.verdictLabel,
        reasons: input.reasons,
        failed: input.failed,
        errorMessage: input.errorMessage,
      },
      $setOnInsert: { _id: new ObjectId(), caseId: caseObjectId, role: input.role, createdAt: now },
    },
    { upsert: true, returnDocument: "after" }
  );
  const d = result!;
  return {
    id: d._id.toHexString(),
    caseId: d.caseId.toHexString(),
    role: d.role,
    model: d.model,
    systemPrompt: d.systemPrompt,
    maxTokens: d.maxTokens,
    output: d.output,
    verdictLabel: d.verdictLabel,
    reasons: d.reasons,
    failed: d.failed,
    errorMessage: d.errorMessage,
    createdAt: d.createdAt.toISOString(),
  };
}

export async function listVerdicts(caseId: string): Promise<VerdictRow[]> {
  const _id = tryParseObjectId(caseId);
  if (!_id) return [];
  const col = await verdictsCol();
  const docs = await col.find({ caseId: _id }).sort({ role: 1 }).toArray();
  return docs.map((d) => ({
    id: d._id.toHexString(),
    caseId: d.caseId.toHexString(),
    role: d.role,
    model: d.model,
    systemPrompt: d.systemPrompt,
    maxTokens: d.maxTokens,
    output: d.output,
    verdictLabel: d.verdictLabel,
    reasons: d.reasons,
    failed: d.failed,
    errorMessage: d.errorMessage,
    createdAt: d.createdAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------------------------
// call_logs — the audit trail. One document per actual OpenRouter call attempt. model/
// systemPrompt/maxTokens are FROZEN here (the actual value in effect for this specific call),
// never a live reference to agent_configs, which is editable — see ADR-0014's consequence and
// docs/rules/audit-and-reliability.md.
// ---------------------------------------------------------------------------------------------

export interface CallLogInput {
  caseId: string;
  role: AgentRole;
  callType: "advocate" | "judge";
  attemptNumber: number;
  model: string;
  systemPrompt: string;
  maxTokens: number;
  userMessage: string;
  status: "success" | "failed";
  output: string | null;
  errorMessage: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  durationMs: number;
  startedAt: Date;
  finishedAt: Date;
}

export async function insertCallLog(input: CallLogInput): Promise<void> {
  const col = await callLogsCol();
  await col.insertOne({
    _id: new ObjectId(),
    caseId: new ObjectId(input.caseId),
    role: input.role,
    callType: input.callType,
    attemptNumber: input.attemptNumber,
    model: input.model,
    systemPrompt: input.systemPrompt,
    maxTokens: input.maxTokens,
    userMessage: input.userMessage,
    status: input.status,
    output: input.output,
    errorMessage: input.errorMessage,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    totalTokens: input.totalTokens,
    costUsd: input.costUsd,
    durationMs: input.durationMs,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
  });
}

export interface CallLogRow extends CallLogInput {
  id: string;
}

export async function listCallLogs(caseId: string): Promise<CallLogRow[]> {
  const _id = tryParseObjectId(caseId);
  if (!_id) return [];
  const col = await callLogsCol();
  const docs = await col.find({ caseId: _id }).sort({ startedAt: 1 }).toArray();
  return docs.map((d) => ({
    id: d._id.toHexString(),
    caseId: d.caseId.toHexString(),
    role: d.role,
    callType: d.callType,
    attemptNumber: d.attemptNumber,
    model: d.model,
    systemPrompt: d.systemPrompt,
    maxTokens: d.maxTokens,
    userMessage: d.userMessage,
    status: d.status,
    output: d.output,
    errorMessage: d.errorMessage,
    promptTokens: d.promptTokens,
    completionTokens: d.completionTokens,
    totalTokens: d.totalTokens,
    costUsd: d.costUsd,
    durationMs: d.durationMs,
    startedAt: d.startedAt,
    finishedAt: d.finishedAt,
  }));
}

/**
 * The genuine, real-usage-derived sum required by docs/cost-budget.md §6 — computed from
 * call_logs' own persisted `totalTokens`/`costUsd` values (themselves each sourced directly from
 * an OpenRouter response's `usage` object, never estimated — see lib/orchestrator/callAgent.ts).
 * Only successful calls contribute usage (a failed attempt's tokens, if OpenRouter charged any
 * before erroring, aren't reliably knowable from this code path and are not counted).
 */
export async function sumRunUsage(
  caseId: string
): Promise<{ totalTokens: number; totalCostUsd: number }> {
  const _id = tryParseObjectId(caseId);
  if (!_id) return { totalTokens: 0, totalCostUsd: 0 };
  const col = await callLogsCol();
  const [agg] = await col
    .aggregate<{ totalTokens: number; totalCostUsd: number }>([
      { $match: { caseId: _id, status: "success" } },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
          totalCostUsd: { $sum: { $ifNull: ["$costUsd", 0] } },
        },
      },
    ])
    .toArray();
  return { totalTokens: agg?.totalTokens ?? 0, totalCostUsd: agg?.totalCostUsd ?? 0 };
}
