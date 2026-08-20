# Data Model

MongoDB Atlas, one database (name from `MONGODB_DB_NAME`, defaults to `"agnet"` — see
`lib/db/client.ts`), 5 collections. No ODM — the official `mongodb` driver only. Collection
document shapes and accessors live in `lib/db/collections.ts`; the query/transform layer that the
rest of the app actually imports lives in `lib/db/queries.ts` (its exported functions return plain
`...Row` DTOs with ISO-string dates and hex-string ids, never raw driver documents or `ObjectId`s).

## `agent_configs`

The **live, editable** configuration for each of the 7 agent roles — one document per role.

```ts
interface AgentConfigDoc {
  _id: AgentRole;       // the role string itself, e.g. "defense-1" — IS the unique key
  model: string;
  systemPrompt: string;
  maxTokens: number;
  updatedAt: Date;
}
```

`AgentRole` (`lib/constants.ts`) is one of: `"defense-1" | "defense-2" | "prosecution-1" |
"prosecution-2" | "judge-1" | "judge-2" | "judge-3"`.

- **No separate `_id: ObjectId`** — using the role string as `_id` makes "exactly one document per
  role" trivial to enforce via upsert-by-`_id`, with no unique index needed beyond the implicit
  primary key.
- **Seeding** (`lib/db/setup.ts`'s `seedAgentConfigs()`, run once at boot via `instrumentation.ts`'s
  `register()`): for each of the 7 roles, `updateOne({_id: role}, {$setOnInsert: {...}}, {upsert:
  true})` — `$setOnInsert` only, so a document that already exists (because a Console user already
  edited it) is never overwritten by a restart-triggered reseed. Seed values: `model` =
  `DEFAULT_MODEL` (`"openai/gpt-4o-mini"`), `systemPrompt` = `PROMPT_SEED[role]` (currently
  `prompts/placeholder.ts`'s inert placeholder text — see [`agent-pipeline.md`](agent-pipeline.md)),
  `maxTokens` = `DEFAULT_MAX_TOKENS[roleKind(role)]` (1300 advocate / 700 judge).
- **No index beyond `_id`** — lookups are always by role.

## `cases`

One document per submitted run.

```ts
type CaseStatus = "running" | "complete" | "partial-failure" | "failed";

interface CaseDoc {
  _id: ObjectId;
  caseText: string;
  submittedAt: Date;
  status: CaseStatus;
  totalTokens: number | null;   // null until the run finishes
  totalCostUsd: number | null;
  totalTimeMs: number | null;
}
```

- `createCase()` inserts with `status: "running"` and all three totals `null`, before any of the 7
  calls fire.
- `finalizeCase()` sets the terminal `status` and the 3 totals in one `updateOne`, once at the very
  end of `runPipeline()`.
- `status` derivation (`runPipeline.ts`): `"failed"` if every advocate *and* every judge call
  failed (and at least one call was attempted); `"partial-failure"` if any call failed but not all;
  `"complete"` otherwise.
- **Index**: `{ submittedAt: -1 }` — supports `listCases()`'s most-recent-first query.
- `listCases()` explicitly excludes `status: "running"` — a case only appears in the past-runs list
  once it reaches a terminal status (the frontend's `PastRunSummary.status` type has no `"running"`
  variant to render).

## `advocate_outputs`

Up to 4 per case — one per advocate role that was actually run.

```ts
interface AdvocateOutputDoc {
  _id: ObjectId;
  caseId: ObjectId;
  role: AgentRole;                          // one of the 4 advocate roles
  stance: "defense" | "prosecution";
  model: string;                            // frozen at call time
  systemPrompt: string;                     // frozen at call time
  maxTokens: number;                        // frozen at call time (already clamped)
  output: string | null;                    // null if the call failed after all retries
  failed: boolean;
  errorMessage: string | null;
  createdAt: Date;
}
```

- Written via `insertAdvocateOutput()`: `findOneAndUpdate({caseId, role}, {$set: {...}, $setOnInsert:
  {_id, caseId, role, createdAt}}, {upsert: true})` — upsert on the compound key, so this is
  idempotent per (case, role).
- **Unique index**: `{ caseId: 1, role: 1 }`.

## `verdicts`

Up to 3 per case — one per judge role that was actually run. Same shape as `advocate_outputs` plus
two judge-specific fields:

```ts
interface VerdictDoc {
  _id: ObjectId;
  caseId: ObjectId;
  role: AgentRole;                          // one of the 3 judge roles
  model: string;
  systemPrompt: string;
  maxTokens: number;
  output: string | null;
  verdictLabel: string | null;              // best-effort parsed, see below
  reasons: string[] | null;                 // best-effort parsed, see below
  failed: boolean;
  errorMessage: string | null;
  createdAt: Date;
}
```

- `verdictLabel`/`reasons` come from `lib/orchestrator/parseJudgeOutput.ts` applied to the raw
  `output` text — `null` for both if the judge's response didn't match the expected `VERDICT:` /
  `REASONS:` trailer format (never guessed). See [`agent-pipeline.md`](agent-pipeline.md).
- Same upsert-on-`{caseId, role}` pattern and unique index as `advocate_outputs`.

## `call_logs` — the audit trail

One document per actual OpenRouter call **attempt** (not per logical call — a retried call
produces multiple documents, one per attempt number).

```ts
interface CallLogDoc {
  _id: ObjectId;
  caseId: ObjectId;
  role: AgentRole;
  callType: "advocate" | "judge";
  attemptNumber: number;                    // 1, 2, or 3 (MAX_ATTEMPTS_PER_CALL = 3)
  model: string;                            // exact value used for THIS attempt
  systemPrompt: string;                     // exact value used for THIS attempt
  maxTokens: number;                        // exact value used for THIS attempt (already clamped)
  userMessage: string;                      // the constructed user message for THIS attempt
  status: "success" | "failed";
  output: string | null;                    // partial/failed output kept if any text streamed in
  errorMessage: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;                   // best-effort — not every OpenRouter provider returns cost
  durationMs: number;
  startedAt: Date;
  finishedAt: Date;
}
```

- Written by `insertCallLog()`, called once per attempt from `callAgent.ts`'s retry loop — a
  successful attempt returns and writes its own row; a failed attempt writes its row and loops to
  the next attempt (or gives up after `MAX_ATTEMPTS_PER_CALL`).
- **Index**: `{ caseId: 1 }` — supports `listCallLogs()`.
- `promptTokens`/`completionTokens`/`totalTokens` come directly from the OpenRouter streaming
  response's `usage` object (`stream_options: { include_usage: true }` +
  `usage: { include: true }` on the request) — never estimated. An attempt without a genuine,
  fully-numeric `usage` object is treated as `status: "failed"` regardless of whether text came
  back (see `runOneAttempt()`'s shape validation in `callAgent.ts`).

### Why `call_logs` snapshots values instead of referencing `agent_configs`

`agent_configs` is live and editable — a Console user can change a role's prompt/model/maxTokens at
any time, including between one run and the next. If `call_logs` stored only a foreign key
(`role`) and relied on joining against the *current* `agent_configs` document to show "what prompt
produced this output," a later edit would silently rewrite what a past run appears to have used —
the audit trail would describe the present, not the past. Embedding `model`/`systemPrompt`/
`maxTokens`/`userMessage` directly on every `call_logs` document (and, redundantly, on
`advocate_outputs`/`verdicts` too) makes each row self-contained: it reflects exactly what was sent
to OpenRouter for that specific attempt, permanently, regardless of any config edit before or
after. This is why `GET /api/cases/:id` reads `advocateOutputs`/`verdicts` rows for their
model/prompt/maxTokens rather than re-reading `agent_configs` — see `app/api/cases/[id]/route.ts`'s
header comment.

### `sumRunUsage` — the genuine per-run total

```ts
sumRunUsage(caseId): Promise<{ totalTokens: number; totalCostUsd: number }>
```

An aggregation over `call_logs` matching `{ caseId, status: "success" }`, summing
`totalTokens`/`costUsd` (via `$ifNull` to treat a missing `costUsd` as 0 for models that don't
report cost). Only successful attempts contribute — a failed attempt's tokens, even if OpenRouter
billed something before erroring, aren't reliably known from this code path and are deliberately
excluded rather than guessed. `runPipeline()` calls this exactly once, after both stages settle, and
writes the result onto the `cases` document via `finalizeCase()`.

## `tryParseObjectId`

A small helper (`lib/db/collections.ts`) used at every API boundary that takes an id from an
untrusted URL segment (`GET /api/cases/:id`) — wraps `new ObjectId(id)` in a try/catch and returns
`null` on a malformed id instead of throwing, so a bad id in the URL becomes a clean 404 rather
than an unhandled exception.
