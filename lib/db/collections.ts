// MongoDB document shapes + collection accessors — the direct replacement for the old
// lib/db/schema.ts's DDL (ADR-0017). One collection per entity from the original SQL sketch, one
// document per row: `agent_configs`, `cases`, `advocate_outputs`, `verdicts`, `call_logs`.
//
// `call_logs` documents still carry the snapshotted prompt/model/max-tokens as embedded fields
// (ADR-0014's requirement, unchanged by the DB swap) — frozen at call time, never a reference to
// the live `agent_configs` document, which is editable.

import type { Collection, Db } from "mongodb";
import { ObjectId } from "mongodb";
import { getDb } from "./client";
import type { AgentRole } from "../constants";

export const COLLECTIONS = {
  AGENT_CONFIGS: "agent_configs",
  CASES: "cases",
  ADVOCATE_OUTPUTS: "advocate_outputs",
  VERDICTS: "verdicts",
  CALL_LOGS: "call_logs",
} as const;

export type CaseStatus = "running" | "complete" | "partial-failure" | "failed";

// `_id` is the role string itself (e.g. "defense-1") — naturally unique per role, no separate id
// field needed, and makes "one document per role" trivial to enforce (upsert by _id).
export interface AgentConfigDoc {
  _id: AgentRole;
  model: string;
  systemPrompt: string;
  maxTokens: number;
  updatedAt: Date;
}

export interface CaseDoc {
  _id: ObjectId;
  caseText: string;
  submittedAt: Date;
  status: CaseStatus;
  totalTokens: number | null;
  totalCostUsd: number | null;
  totalTimeMs: number | null;
}

export interface AdvocateOutputDoc {
  _id: ObjectId;
  caseId: ObjectId;
  role: AgentRole;
  stance: "defense" | "prosecution";
  model: string;
  systemPrompt: string;
  maxTokens: number;
  output: string | null;
  failed: boolean;
  errorMessage: string | null;
  createdAt: Date;
}

export interface VerdictDoc {
  _id: ObjectId;
  caseId: ObjectId;
  role: AgentRole;
  model: string;
  systemPrompt: string;
  maxTokens: number;
  output: string | null;
  verdictLabel: string | null;
  reasons: string[] | null;
  failed: boolean;
  errorMessage: string | null;
  createdAt: Date;
}

export interface CallLogDoc {
  _id: ObjectId;
  caseId: ObjectId;
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

export async function agentConfigsCol(): Promise<Collection<AgentConfigDoc>> {
  const db: Db = await getDb();
  return db.collection<AgentConfigDoc>(COLLECTIONS.AGENT_CONFIGS);
}
export async function casesCol(): Promise<Collection<CaseDoc>> {
  const db: Db = await getDb();
  return db.collection<CaseDoc>(COLLECTIONS.CASES);
}
export async function advocateOutputsCol(): Promise<Collection<AdvocateOutputDoc>> {
  const db: Db = await getDb();
  return db.collection<AdvocateOutputDoc>(COLLECTIONS.ADVOCATE_OUTPUTS);
}
export async function verdictsCol(): Promise<Collection<VerdictDoc>> {
  const db: Db = await getDb();
  return db.collection<VerdictDoc>(COLLECTIONS.VERDICTS);
}
export async function callLogsCol(): Promise<Collection<CallLogDoc>> {
  const db: Db = await getDb();
  return db.collection<CallLogDoc>(COLLECTIONS.CALL_LOGS);
}

/** Parses a string into an ObjectId, or returns null for a malformed id (never throws) — used at
 * API-route boundaries where the id comes from an untrusted URL segment. */
export function tryParseObjectId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}
