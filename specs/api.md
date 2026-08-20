# API Reference

All 5 routes live under `app/api/`, implemented as Next.js Route Handlers. All non-streaming
routes return JSON via `NextResponse.json(...)`; all catch their own errors and return `{ error:
string }` with a `500` (or `400`/`404` for client-caused problems) rather than letting an exception
surface as an opaque platform error.

## `GET /api/agent-config`

File: `app/api/agent-config/route.ts`.

Returns the current, live config for all 7 agent roles (from `agent_configs`).

**Response `200`:**
```ts
{ agents: Array<{ role: AgentRole; model: string; systemPrompt: string; maxTokens: number }> }
```

**Response `500`:** `{ error: "Failed to load agent config: <message>" }` — e.g. the database is
unreachable. The route never fabricates a placeholder config in this case; the Console's contract
is to show a genuine "config unavailable" state instead.

## `PUT /api/agent-config/:role`

File: `app/api/agent-config/[role]/route.ts`.

Edits one agent's `model`/`systemPrompt`/`maxTokens`. All 3 fields are optional in the body — only
the fields present are patched.

**Request body** (all optional):
```ts
{ model?: string; systemPrompt?: string; maxTokens?: number }
```

**Validation:**
- `:role` must be one of the 7 valid `AgentRole` values (`isAgentRole()`) → else `404`
  `{ error: "Unknown agent role: <role>" }`.
- Body must be valid JSON → else `400` `{ error: "Request body must be valid JSON." }`.
- `model`, if present, must be a non-empty string (trimmed before saving) → else `400`.
- `systemPrompt`, if present, must be a string (empty string is allowed here — the empty-prompt
  block only applies at run time, not at save time) → else `400`.
- `maxTokens`, if present, must be a finite positive number → else `400`. The value saved is
  **`clampMaxTokens(role, maxTokens)`** — silently clamped to the hard per-role ceiling (1300
  advocate / 700 judge) before being persisted; the response reflects the clamped value, not what
  was sent.

**Response `200`:** `{ role, model, systemPrompt, maxTokens }` — the row as actually saved (post-clamp).

**Response `404`:** `{ error: "Agent config row not found for role: <role>" }` — should not happen
in practice since all 7 roles are seeded at boot, but handled explicitly (`findOneAndUpdate`
returning null).

**Response `500`:** `{ error: "Failed to save agent config: <message>" }`.

This endpoint never rewrites any past run's `call_logs`/`advocate_outputs`/`verdicts` rows — those
are frozen at call time regardless of later edits here.

## `GET /api/models`

File: `app/api/models/route.ts`.

Returns the curated, fixed list of OpenRouter model ids the Console's dropdowns populate from —
purely static, no OpenRouter call, no database access, no secret involved.

**Response `200`:**
```ts
{ models: string[] }
// currently CURATED_MODELS from lib/constants.ts:
// ["openai/gpt-4o-mini", "openai/gpt-4o", "anthropic/claude-sonnet-4.5",
//  "anthropic/claude-3-haiku", "google/gemini-2.5-flash",
//  "meta-llama/llama-3.1-70b-instruct", "mistralai/mistral-large"]
```

No error path — this handler cannot fail (no I/O).

## `GET /api/cases`

File: `app/api/cases/route.ts`.

The past-runs history list — every terminal-status case, most recent first (up to `listCases()`'s
default `limit = 50`).

**Response `200`:**
```ts
{
  cases: Array<{
    id: string;
    defendant: string;   // heuristically derived, see lib/caseSummary.ts
    act: string;          // heuristically derived
    submittedAt: string;  // ISO timestamp
    status: "complete" | "partial-failure" | "failed";  // never "running" — excluded at the query
  }>
}
```

`defendant`/`act` are **not** stored/structured fields — `deriveCaseSummary()` splits `caseText` on
the first comma/period/newline as a display heuristic only; the full `caseText` is never altered or
truncated in storage.

**Response `500`:** `{ error: "Failed to load past runs: <message>" }`.

## `GET /api/cases/:id`

File: `app/api/cases/[id]/route.ts`.

Full detail for reopening one past run, read-only — every advocate output and every verdict for
that case, each carrying its own frozen `model`/`systemPrompt`/`maxTokens` (from the
`advocate_outputs`/`verdicts` documents themselves, never the live `agent_configs`).

**Response `200`:**
```ts
{
  id: string;
  defendant: string;
  act: string;
  question: string;    // == caseText, kept for a provisional frontend shape's compatibility
  caseText: string;
  submittedAt: string;
  status: CaseStatus;
  agents: Array<{
    role: AgentRole;
    model: string;
    systemPrompt: string;
    maxTokens: number;
    output: string | null;
    failed: boolean;
    judgeResult?: { verdict: string; reasons: string[] };  // only present for judge roles with a parsed verdict
  }>;  // advocate_outputs entries first, then verdicts entries — not merged/sorted by role
  summary: { totalTokens: number; totalCostUsd: number; totalTimeMs: number } | null;
  // null only if ALL THREE of cases.totalTokens/totalCostUsd/totalTimeMs are null
  // (i.e. the case never finished) — otherwise any individual null is coerced to 0
}
```

**Response `404`:** `{ error: "No case found with id: <id>" }` — including for a malformed
(non-ObjectId) `:id`, since `getCase()` returns `null` in that case via `tryParseObjectId`.

**Response `500`:** `{ error: "Failed to load case <id>: <message>" }`.

## `POST /api/run`

File: `app/api/run/route.ts`. `export const dynamic = "force-dynamic"`, `export const runtime =
"nodejs"`.

Starts one full 7-call deliberation and streams progress back as **Server-Sent Events** over a
`fetch`-compatible streamed `Response` — not `EventSource` (which cannot send a POST body).

**Request body:**
```ts
{
  caseText: string;                 // non-empty (trimmed) required
  agents: Array<{
    role: AgentRole;                // must be one of the 7 valid roles, no duplicates
    model: string;                  // non-empty required
    systemPrompt: string;           // non-empty required
    maxTokens: number;               // finite, > 0 required
  }>;                                // must include all 4 advocate roles; judge roles are each optional
}
```
Validated by `lib/orchestrator/validate.ts`'s `validateRunRequest()`. This is exactly what's
currently in the Console's fields at the moment Run is pressed — the route does **not** re-read
`agent_configs` itself, so an unsaved edit still takes effect for the run.

**Response `400`** (validation or malformed-JSON failure), plain JSON, not SSE:
```ts
{ error: string }
```
Examples of the exact error strings: `"caseText is required and must be a non-empty string."`,
`"Invalid or missing agent role: <role>"`, `"Duplicate agent role in request: <role>"`,
`"Agent <role>: systemPrompt is required (empty prompts must be blocked before submitting a run)."`,
`"All 4 advocate roles must be present with a non-empty prompt (judges need the full bundle) — missing: <roles>."`

**Response `200`** on a valid request — headers:
```
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```
Body: a sequence of `data: <JSON>\n\n` frames (`lib/orchestrator/events.ts`'s `encodeSseEvent`),
one `RunEvent` per frame. Exact `RunEvent` union (shared, by hand, between
`lib/orchestrator/events.ts` and `components/console/api.ts` — no shared package):

```ts
type RunEvent =
  | { type: "agent-status"; role: AgentRole; status: "running" }
  | { type: "agent-delta"; role: AgentRole; textDelta: string }
  | { type: "agent-done"; role: AgentRole; output: string;
      judgeResult?: { verdict: string; reasons: string[] } }   // present only for a judge whose output parsed
  | { type: "agent-failed"; role: AgentRole; errorMessage: string }
  | { type: "summary"; totalCostUsd: number; totalTokens: number; totalTimeMs: number }
  | { type: "run-done" }
  | { type: "run-failed"; errorMessage: string };
```

**Event sequence for one run** (up to 7 agents × up to 3 attempts each internally, but only these
event types cross the wire):
1. Per agent, on its first attempt: `agent-status` (`running`), then zero or more `agent-delta`
   (only the *first* attempt of a call streams live text — a retried attempt's tokens are not
   streamed to the client, a known cosmetic gap noted in `callAgent.ts`'s comments; the eventual
   `agent-done`/`agent-failed` always carries the true final value regardless of which attempt
   produced it).
2. Per agent, exactly one terminal event: `agent-done` (only after all `MAX_ATTEMPTS_PER_CALL`
   attempts either succeed or all fail — a mid-retry failure does not emit `agent-failed`) or
   `agent-failed`.
3. Stage 1 (4 advocates) fully settles before stage 2 (judges) begins.
4. Once both stages settle: one `summary` event, then one `run-done` event, then the stream closes.
5. `run-failed` can arrive **instead of** the normal sequence at any point, only for something that
   makes the run itself impossible (e.g. the database becomes unreachable mid-run) — not for an
   individual call's failure, which is always an `agent-failed` event with the rest of the run
   continuing.
6. A malformed/unparseable SSE frame is treated client-side as its own synthetic `run-failed` event
   (`components/console/api.ts`'s `runPipeline()`), never silently dropped.

The pipeline keeps running server-side (writing to the database) even if the client disconnects
before the stream finishes — `controller.enqueue` failures inside `emit()` are caught and ignored.
