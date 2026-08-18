// Idempotent index creation + agent_configs seeding — the MongoDB replacement for the old
// lib/db/migrate.ts's SQL DDL + seed (ADR-0017). MongoDB needs no schema/DDL (collections are
// created implicitly on first write), so "setup" here means only: (1) the indexes the old SQL
// UNIQUE constraints and lookup patterns relied on, and (2) seeding the 7 agent_config documents
// with placeholder prompt text on first run. Called once from instrumentation.ts at server boot.

import { agentConfigsCol, advocateOutputsCol, verdictsCol, casesCol, callLogsCol } from "./collections";
import { PROMPT_SEED } from "../../prompts/index";
import { ALL_ROLES, DEFAULT_MODEL, DEFAULT_MAX_TOKENS, roleKind } from "../constants";

let ensured: Promise<void> | null = null;

export function ensureDb(): Promise<void> {
  // Memoize so concurrent requests during boot don't race to run setup twice; a genuine failure
  // clears the memo so a later request can retry rather than being stuck on a rejected promise.
  if (!ensured) {
    ensured = runSetup().catch((err) => {
      ensured = null;
      throw err;
    });
  }
  return ensured;
}

async function runSetup(): Promise<void> {
  await Promise.all([ensureIndexes(), seedAgentConfigs()]);
}

async function ensureIndexes(): Promise<void> {
  const [advocateOutputs, verdicts, cases, callLogs] = await Promise.all([
    advocateOutputsCol(),
    verdictsCol(),
    casesCol(),
    callLogsCol(),
  ]);

  await Promise.all([
    // Mirrors the old SQL UNIQUE (case_id, role) constraint on both tables.
    advocateOutputs.createIndex({ caseId: 1, role: 1 }, { unique: true }),
    verdicts.createIndex({ caseId: 1, role: 1 }, { unique: true }),
    // Lookup/sort patterns the old CREATE INDEX statements covered.
    cases.createIndex({ submittedAt: -1 }),
    callLogs.createIndex({ caseId: 1 }),
  ]);
}

async function seedAgentConfigs(): Promise<void> {
  const col = await agentConfigsCol();
  await Promise.all(
    ALL_ROLES.map((role) =>
      // Upsert with $setOnInsert only: an already-edited document (by the Console's user) is
      // never overwritten by a reseed on the next server restart — same semantics as the old
      // `ON CONFLICT (role) DO NOTHING`.
      col.updateOne(
        { _id: role },
        {
          $setOnInsert: {
            model: DEFAULT_MODEL,
            systemPrompt: PROMPT_SEED[role],
            maxTokens: DEFAULT_MAX_TOKENS[roleKind(role)],
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      )
    )
  );
}
