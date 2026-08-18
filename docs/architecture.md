# Architecture — agnet-project

> Architecture, applying [Module 7](modules/module7-web-application-architecture.md)'s four-part
> model (browser / backend / database / deployment) to this project. Stack is now decided — see
> [the ADR index](decisions/README.md) for the options considered and why (deployment specifically
> is [ADR-0013](decisions/0013-docker-compose-local-render-production.md), superseding 0012). This
> project is confirmed to be the course's own "Tribunal": a reusable web app over any submitted
> case, not a one-off script over a single fixed case — see [`docs/framing.md`](framing.md) §2/§4.
> See [`CLAUDE.md`](../CLAUDE.md) for the rules this must satisfy.

## 1. The Four Parts, Applied Here

| Part | Role in agnet-project | Stack |
|---|---|---|
| **Browser** | **One single page** ("the Console" — [ADR-0015](decisions/0015-single-page-console-ui.md), 2026-08-17, supersedes the earlier 3-screen + admin-console split): case input, all 7 agents' config (model, system prompt seeded from the teacher's default, output-token limit), one Run button, live streamed output per agent, results (verdicts + arguments), a cost/tokens/time summary, and a lightweight past-runs history panel. One audience, no admin/public split. Untrusted by design — see §4 (the OpenRouter key stays outside this trust boundary; prompt text, as of ADR-0014, is inside it). | Next.js (React, App Router), TypeScript — [ADR-0009](decisions/0009-fullstack-nextjs-typescript.md) |
| **Backend** | Orchestrates all 7 agent calls: builds each advocate's bundle (case + its teacher-provided system prompt + our own soft token-length instruction in the user message) and each judge's bundle (case + all 4 advocate outputs + judge system prompt + soft length instruction), calls OpenRouter for each with a `max_tokens` hard cap, writes results. Holds the OpenRouter key and all 7 system prompts — never sent to the browser. See [`docs/cost-budget.md`](cost-budget.md) §2 for the exact per-role numbers. | Next.js Route Handlers (`app/api/`), TypeScript, `openai` SDK pointed at OpenRouter — [ADR-0009](decisions/0009-fullstack-nextjs-typescript.md), [ADR-0010](decisions/0010-raw-sdk-not-langchain.md) |
| **Database** | Persists every submitted case, its 4 advocate outputs, its 3 verdicts, and a call-log document per model call (model, output, tokens, cost, time) — the audit trail required by [[CLAUDE.md]] §2. Also what makes the past-cases list possible. | MongoDB Atlas (hosted, remote) — [ADR-0017](decisions/0017-mongodb-atlas-database.md), supersedes Supabase/Postgres in ADR-0011 |
| **Deployment** | Serves the Next.js app (frontend + Route Handlers) as one container, locally and in production. | Docker Compose (local; app container only — no local DB container needed, both environments point at the same Atlas cluster) → AWS App Runner (production, via Amazon ECR) — [ADR-0013](decisions/0013-docker-compose-local-render-production.md) (local), [ADR-0016](decisions/0016-aws-app-runner-production.md) (production, supersedes Render), [ADR-0017](decisions/0017-mongodb-atlas-database.md) (database) |

## 2. Request Cycle — One Full Run

```
Browser                      Backend                              Database
   │                             │                                    │
   │  user submits a charge sheet (defendant, act, exact question)    │
   │────────────────────────────>│                                    │
   │                             │──> write case ────────────────────>│
   │                             │
   │                             │──> call Advocate #1 (defense,  strategy A)  ┐
   │                             │──> call Advocate #2 (defense,  strategy B)  │ all 4 IN PARALLEL
   │                             │──> call Advocate #3 (prosecution, theory C) │ (no dependency
   │                             │──> call Advocate #4 (prosecution, theory D) ┘  between them)
   │                             │      single-shot, no shared context — see [[CLAUDE.md]] §2
   │                             │──> write each output + call-log row ─────────────────────────>│
   │                             │
   │                             │──> build bundle = case + all 4 outputs   (waits for all 4)
   │                             │──> call Judge #1 (teacher prompt)  ┐
   │                             │──> call Judge #2 (teacher prompt)  │ all 3 IN PARALLEL
   │                             │──> call Judge #3 (teacher prompt)  ┘ (no cross-talk)
   │                             │──> write each verdict + call-log row ────────────────────────>│
   │                             │
   │<────────── 4 outputs + 3 verdicts ─────────────────────────│
   │  (rendered for the student to read; also retrievable later via the past-cases list)
```

7 OpenRouter calls total per run (4 advocates + 3 judges), ~17,000 tokens for a full deliberation
per [Module 9](modules/module9-cognified-software-and-agent-economics.md) — judges cost the most
since each reads all 4 advocate outputs. Each call is single-shot — no conversation state carried
between calls (see `CLAUDE.md` §2). **Two stages, each parallelized internally**: the 4 advocates
run at once (nothing between them to wait on), then the 3 judges run at once once all 4 advocate
outputs exist. Per Module 9's own figures for this exact shape: fully sequential ≈ 21s; run this
way ≈ 6s. The charge sheet is identical across all 7 calls — use prompt caching on it (see
[`docs/rules/cost-and-performance.md`](rules/cost-and-performance.md)). A hard cap on
calls-per-deliberation bounds the cost of a runaway run — see Open Questions for the exact number.

## 3. Database Shape (MongoDB Atlas, collections — real, 2026-08-17, [ADR-0017](decisions/0017-mongodb-atlas-database.md))

Engine changed from Postgres/Supabase to **MongoDB Atlas** — a single hosted, remote cluster used
by both local dev and production via the same `MONGODB_URI` (no local DB container, unlike the
old Postgres setup — see [ADR-0013](decisions/0013-docker-compose-local-render-production.md)'s
local-Compose entry, updated accordingly). Official `mongodb` Node driver, no ODM/Mongoose (ADR-
0010's raw-SDK reasoning applied to the DB too). Database name within the cluster is **`agnet`**
(overridable via `MONGODB_DB_NAME`, not otherwise specified anywhere — `backend`'s pick). No
DDL/migration chain — collections are created implicitly on first write; `lib/db/setup.ts` (run
once at boot, from `instrumentation.ts`) only creates indexes and seeds `agent_configs`, the same
job the earlier SQL migration did. Real shape (`lib/db/collections.ts`):

- **`cases`** — `_id` (ObjectId), `caseText` (the free-form charge sheet — defendant, act, exact
  question all in one field, per [ADR-0015](decisions/0015-single-page-console-ui.md)), `submittedAt`,
  `status` (`running` | `complete` | `partial-failure` | `failed`), and the run-level `totalTokens`/
  `totalCostUsd`/`totalTimeMs` sum required by `docs/cost-budget.md` §6 (null until the run
  finishes). Index: `{submittedAt: -1}`. `GET /api/cases` excludes `status: 'running'` rows — the
  frontend's `PastRunSummary.status` type only has the 3 terminal values, so a still-running case
  simply isn't listed yet.
- **`advocate_outputs`** (≤4 per run) — `_id`, `caseId` (ObjectId ref), `role`, `stance`
  (`defense`/`prosecution`), `model`, `systemPrompt`, `maxTokens` (all three frozen at call time —
  see below), `output`, `failed`, `errorMessage`, `createdAt`. Unique index `{caseId: 1, role: 1}`
  (mirrors the old SQL `UNIQUE (case_id, role)`); written via an upsert on that same key.
- **`verdicts`** (≤3 per run) — same shape as `advocate_outputs` plus `verdictLabel`/`reasons`
  (best-effort parsed from the judge's response text against a fixed trailer format we ask for in
  the user message — never guessed if parsing fails, see `lib/orchestrator/parseJudgeOutput.ts`).
  Unique index `{caseId: 1, role: 1}`.
- **`call_logs`** (=7 per run, more with retries, ≤21 — `docs/cost-budget.md` §5) — one document
  per actual OpenRouter call *attempt*: `caseId`, `role`, `callType`, `attemptNumber`, and **the
  actual `model`/`systemPrompt`/`maxTokens`/`userMessage` in effect for that specific call**,
  embedded directly on the document (snapshotted, never a reference to the live `agent_configs`
  document — see ADR-0014's consequence), plus `status`, `output`, `errorMessage`, `promptTokens`/
  `completionTokens`/`totalTokens`/`costUsd` (from OpenRouter's real `usage` object), `durationMs`,
  `startedAt`/`finishedAt`. This *is* the audit trail — see [[CLAUDE.md]] §2's audit-trail rule.
  Index: `{caseId: 1}`.
- **`agent_configs`** ([ADR-0014](decisions/0014-editable-agent-config-admin-console.md)) — one
  document per agent role, with **`_id` = the role string itself** (`defense-1`, `defense-2`,
  `prosecution-1`, `prosecution-2`, `judge-1`, `judge-2`, `judge-3`) rather than a separate id
  field — naturally enforces "one document per role." `model`, `systemPrompt` (seeded with the
  teacher's placeholder-marked text as the default; editable via the Console), `maxTokens`,
  `updatedAt`. This is the **live, editable** config a run may read from by default; `call_logs`'
  snapshot (above) is what makes a past run's actual inputs reconstructable even after this
  collection changes. Seeded idempotently via `updateOne({_id: role}, {$setOnInsert: {...}},
  {upsert: true})` — an already-edited document is never overwritten by a reseed on restart.

## 4. Trust Boundary (Module 7 rule, restated concretely here — updated 2026-08-17)

- The OpenRouter API key lives only in backend config/environment — never shipped to the browser,
  never in client-side JS, never committed to the repo in plaintext. This is unchanged and not up
  for revisiting.
- **System prompt text is no longer inside this boundary, as of [ADR-0014](decisions/0014-editable-agent-config-admin-console.md).**
  The teacher's text is the seeded default for each agent, read from `agent_config`; the Admin/Run
  Console lets a user view and edit it, so it necessarily travels to and from the browser like
  ordinary application data. What's preserved from the original rule: we (the builders) never
  author new prompt content ourselves — only the console's user edits the loaded value, and only
  the teacher's text is what ships as the default.
- Every call's actual prompt/model/max-tokens is frozen onto its `call_log` row at call time (§3),
  so a past run stays reconstructable regardless of later `agent_config` edits.

## 5. The Console (single page — ADR-0014 for the editable-config mechanism, ADR-0015 for the page structure)

One page, not four:

- **Per-agent config panel** (×7: 2 defense, 2 prosecution, 3 judges) — model select, system
  prompt textarea (seeded from `agent_config.system_prompt`, i.e. the teacher's default until
  edited), max-output-tokens input (seeded from the `docs/cost-budget.md` §2 numbers — 1,300
  advocates / 700 judges — as sane defaults, not a removed ceiling).
- **One "Run" button** — triggers the same two-stage pipeline as §2, reading current
  `agent_configs` values rather than hardcoded prompt files.
- **Live per-agent output** — each of the 7 calls streams its output as it's generated (OpenRouter
  chat completions support `stream: true`); the console shows each agent "thinking" in its own
  panel rather than only a final blob once the call completes. Needs a streaming transport from
  backend to browser (e.g. Server-Sent Events, one stream per call, multiplexed by role) —
  backend agent's call to make on the exact mechanism.
- **Run summary box** — once the run completes: total cost, total tokens (same real
  `usage`-derived sum as `docs/cost-budget.md` §6, not a separate estimate), and the 3 judges'
  decisions surfaced together for a quick read (the actual verdicts still live on the normal
  results screen too — this is a summary, not a replacement view).

See `docs/interface-brief-console.md` for the full interface brief (states, hierarchy, interaction
model) — this section only covers what's structurally new for the backend/DB. The two earlier,
now-superseded briefs (`interface-brief-opinion-screen.md`, `interface-brief-admin-console.md`)
are kept on disk for their still-relevant detail, which the console brief carries forward.

## 6. Open Questions (carried from CLAUDE.md §6, architecture-relevant subset)

- [x] The MongoDB collection shape/indexes — resolved 2026-08-17, see `lib/db/collections.ts`
      (document shapes + index definitions), `lib/db/queries.ts` (query layer), `lib/db/setup.ts`
      (idempotent index creation + `agent_configs` seed, run once at boot via `instrumentation.ts`).
      §3 above has the real specifics.
- [x] Real, working MongoDB Atlas credentials — resolved 2026-08-17 (Atlas database user's
      password reset to match `.env`). Confirmed via a real end-to-end run: all 7 OpenRouter calls
      succeeded, `call_logs`/`advocate_outputs`/`verdicts`/`cases` all persisted correctly, and the
      genuine `usage`-derived token/cost sum on `cases` matched a manual re-sum of `call_logs`
      exactly. Also confirmed live: a `call_logs` document's snapshotted `model`/`systemPrompt`/
      `maxTokens` did not change after editing that same role's `agent_configs` document
      afterward — ADR-0014's snapshot guarantee holds in practice, not just in code review.
- [ ] Whether local dev and production share the same Atlas database or use separate ones — not
      decided, flagged in ADR-0017 rather than assumed. (`backend` picked the *name* `agnet` for
      whichever database this ends up being — see §3 — that's a placeholder choice, not this
      decision.)
- [ ] Which OpenRouter model(s) ship as the *default* selection per agent — the mechanism (
      user-configurable per agent via the Console, ADR-0014) is decided; the seeded default
      (`lib/constants.ts`'s `DEFAULT_MODEL`, currently `openai/gpt-4o-mini`) is a placeholder pick,
      not a considered decision — revisit once real model choice/cost tradeoffs matter.
- [x] Exact streaming transport — resolved 2026-08-17: Server-Sent Events (`data: {...}\n\n`
      frames) over a streamed POST response (`app/api/run/route.ts`), matching what
      `components/console/api.ts` had already been built against. Unaffected by the database swap.
