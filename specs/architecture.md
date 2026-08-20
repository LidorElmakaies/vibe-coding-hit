# Architecture

The four-part model (browser / backend / database / deployment), as the real code implements it.

## 1. Component map

| Part | Real components |
|---|---|
| **Browser** | `app/page.tsx` (the Console, one client component, `"use client"`) composing `components/console/*.tsx`: `CaseInputSection`, `AgentPanelGroup` (×3: Defense/Prosecution/Judges) → `AgentPanel` (×7), `ModelSelector`, `RunControl`, `VerdictsSummary`, `RunSummaryBox`, `PastRunsPanel`. Styling via `components/console/console.module.css` (CSS Modules). Client-side data access isolated in `components/console/api.ts`. |
| **Backend** | Next.js Route Handlers under `app/api/**/route.ts` (5 routes, see [`api.md`](api.md)); orchestration in `lib/orchestrator/*.ts`; OpenRouter client in `lib/openrouter/client.ts`; shared constants in `lib/constants.ts`; the teacher-prompt seed in `prompts/index.ts`/`prompts/placeholder.ts`. Runs as Node.js (`export const runtime = "nodejs"` in `app/api/run/route.ts`). |
| **Database** | MongoDB Atlas, one hosted cluster, connected via the official `mongodb` driver (no ODM). Client singleton in `lib/db/client.ts`; collection accessors + document types in `lib/db/collections.ts`; the query layer in `lib/db/queries.ts`; idempotent index/seed setup in `lib/db/setup.ts`, invoked once at process boot from `instrumentation.ts`. |
| **Deployment** | One `Dockerfile` (Next.js standalone output) used both by `docker-compose.yml` (local) and, via Amazon ECR, AWS App Runner (production). `.github/workflows/deploy.yml` automates build → ECR push → App Runner redeploy on every push to `main`. See [`deployment.md`](deployment.md). |

## 2. Request cycle — one full run

```
Browser (app/page.tsx)              Backend (app/api/run + lib/orchestrator)         Database
      │                                          │                                        │
      │ POST /api/run { caseText, agents[] }     │                                        │
      │──────────────────────────────────────────>│                                        │
      │                                          │──> validateRunRequest()               │
      │                                          │──> runPipeline():                     │
      │                                          │     createCase() ─────────────────────>│  cases (status: "running")
      │                                          │
      │                                          │     Stage 1 — 4 advocates in parallel  │
      │                                          │     (Promise.all over ADVOCATE_ROLES)  │
      │                                          │       each: buildAdvocateUserMessage() │
      │                                          │             → callAgent() → OpenRouter │
      │                                          │       each attempt ───────────────────>│  call_logs (1 doc/attempt)
      │  SSE: agent-status/agent-delta/agent-done │       each settled ────────────────────>│  advocate_outputs (upsert)
      │<══════════════════════════════════════════│
      │                                          │
      │                                          │     Stage 2 — 3 judges in parallel,    │
      │                                          │     only after all 4 advocates settle  │
      │                                          │       buildJudgeUserMessage(case, bundle)
      │                                          │             → callAgent() → OpenRouter │
      │                                          │       each attempt ───────────────────>│  call_logs
      │  SSE: agent-status/agent-delta/agent-done │       parseJudgeOutput() best-effort   │
      │<══════════════════════════════════════════│       each settled ────────────────────>│  verdicts (upsert)
      │                                          │
      │                                          │     sumRunUsage(caseId) ───────────────>│  reads call_logs (status: success)
      │                                          │     finalizeCase(status, totals) ──────>│  cases (terminal status + totals)
      │  SSE: summary, then run-done              │                                        │
      │<══════════════════════════════════════════│
```

Two stages, each internally parallel via `Promise.all` (`lib/orchestrator/runPipeline.ts`): the 4
advocate calls have no dependency on each other, so they fire together; the 3 judge calls also fire
together, but only once every advocate call has *settled* (succeeded or exhausted retries) — the
judge bundle is built from `advocateResults`, the resolved array from stage 1's `Promise.all`.
There is no cross-talk between agents, and no conversation state — every `callAgent()` invocation is
one `chat.completions.create` with exactly a `system` and a `user` message.

The whole run (both stages plus finalization) executes inside the `POST /api/run` handler's
`ReadableStream` `start()` callback, and continues to completion server-side even if the client
disconnects (the `emit()` closure swallows a "controller already closed" error and the pipeline
keeps writing to the database regardless) — see `app/api/run/route.ts`.

## 3. Trust boundary

Per [ADR-0014](../docs/decisions/0014-editable-agent-config-admin-console.md) and
[ADR-0015](../docs/decisions/0015-single-page-console-ui.md), this project deliberately runs one
audience, one page, with a specific, narrower secret boundary than the original design:

**Never reaches the browser, in any form** — `OPENROUTER_API_KEY`:
- Read exactly once, in `lib/openrouter/client.ts`'s `getOpenRouterClient()`, from
  `process.env.OPENROUTER_API_KEY`.
- Never included in any `NextResponse.json(...)` body anywhere in `app/api/**` — confirmed by
  inspection: no route handler references `OPENROUTER_API_KEY` except indirectly through
  `getOpenRouterClient()`, which is only called from `lib/orchestrator/callAgent.ts`, entirely
  server-side.
- `MONGODB_URI` gets the same treatment (read only in `lib/db/client.ts`), though it's not called
  out by the same "full stop, no reversal" language in `docs/rules/security-and-permissions.md` —
  in practice it never appears in a response body either.

**Deliberately does reach the browser, as ordinary application data** — the 7 agents' `model`,
`systemPrompt`, and `maxTokens`:
- `GET /api/agent-config` returns all 7 rows' full `systemPrompt` text in plain JSON.
- `PUT /api/agent-config/:role` accepts edited `systemPrompt`/`model`/`maxTokens` from the browser
  and persists it — no server-side content filtering or "is this the teacher's text" check; any
  string is accepted (only non-empty is enforced, and only for `model`).
- `POST /api/run`'s request body carries the full `agents[]` array (role, model, systemPrompt,
  maxTokens) from whatever is currently in the Console's fields — not re-read from the database —
  so an unsaved edit still takes effect for that run (see `app/api/run/route.ts`'s header comment).

**Frozen regardless of later edits** — every `call_logs` document embeds the exact `model` /
`systemPrompt` / `maxTokens` / `userMessage` that were actually sent for that specific call attempt,
never a reference to the live, editable `agent_configs` document. See [`data-model.md`](data-model.md)
§"Why call_logs snapshots".

**Hard-enforced regardless of what the browser sends** — `maxTokens`:
- `lib/constants.ts`'s `HARD_MAX_TOKENS` (`{ advocate: 1300, judge: 700 }`) is applied via
  `clampMaxTokens()` in two independent places: `PUT /api/agent-config/:role` (so what's *saved*
  is already clamped) and `lib/orchestrator/runPipeline.ts` (so even an un-saved, unclamped value
  submitted directly in a `POST /api/run` body is clamped again right before the OpenRouter call).
- The 21-call ceiling (`MAX_CALLS_PER_RUN`) and the 3-attempts-per-call ceiling
  (`MAX_ATTEMPTS_PER_CALL`) are enforced server-side only, via `reserveCallSlot()` in
  `runPipeline.ts` and the retry loop in `callAgent.ts` — nothing about them is client-configurable.

## 4. What the backend never does

- Never authors or edits system prompt *content* itself — only a human via the Console UI does
  (`PUT /api/agent-config/:role`).
- Never sends a partial advocate bundle to a judge — `buildJudgeUserMessage` always iterates all 4
  `ADVOCATE_ROLES` slots, substituting an explicit unavailable-marker string for a failed one
  rather than omitting it.
- Never reports a call as successful without validating its response shape first — see
  `runOneAttempt()` in `lib/orchestrator/callAgent.ts`: empty text or a missing/malformed `usage`
  object is treated as a failure and retried, never accepted as a real result.
