# Agent Pipeline

The orchestration of the 7 agent calls. Core files: `lib/orchestrator/runPipeline.ts` (the
orchestrator), `lib/orchestrator/callAgent.ts` (one call's retry/attempt loop), `lib/orchestrator/bundle.ts`
(user-message construction), `lib/orchestrator/parseJudgeOutput.ts` (verdict parsing),
`lib/orchestrator/validate.ts` (request validation), `lib/orchestrator/events.ts` (the SSE wire
type), `lib/constants.ts` (roles, caps, curated models).

## The 7 roles

```ts
type AgentRole =
  | "defense-1" | "defense-2" | "prosecution-1" | "prosecution-2"
  | "judge-1" | "judge-2" | "judge-3";

ADVOCATE_ROLES = ["defense-1", "defense-2", "prosecution-1", "prosecution-2"];
JUDGE_ROLES = ["judge-1", "judge-2", "judge-3"];
```

`stanceOf(role)` maps a role name's prefix to `"defense" | "prosecution" | null`. `roleKind(role)`
maps to `"advocate" | "judge"` (anything in `JUDGE_ROLES` is `"judge"`, everything else is
`"advocate"`) — used to pick the right entry from `HARD_MAX_TOKENS`/`DEFAULT_MAX_TOKENS`/
`SOFT_LENGTH_TARGET`.

## Two-stage parallel execution

`runPipeline(input, emit)`:

1. `createCase(caseText)` — writes the `cases` row (`status: "running"`) before any call fires.
2. A closure-scoped `callsIssued` counter and `reserveCallSlot()` function implement the 21-call
   ceiling (see below) — shared across both stages via the same closure.
3. **Stage 1**: `Promise.all` over the advocate configs found in `input.agents` (only roles present
   in the request run — but `validateRunRequest` requires all 4 advocate roles to be present, so in
   practice this is always all 4). Each: clamp `maxTokens`, build the user message
   (`buildAdvocateUserMessage`), call `callAgent()`, then `insertAdvocateOutput()`, then emit
   `agent-done`/`agent-failed`.
4. The **advocate bundle** for judges is built from the *resolved* `advocateResults` array (not
   re-fetched from the database) — `{ role, output, failed }` per advocate.
5. **Stage 2**: `Promise.all` over whichever judge configs were present in `input.agents` (judges
   are optional per-request — a judge with an empty prompt is excluded client-side before the
   request is even sent, see `frontend.md`). Each: clamp `maxTokens`, build the user message
   (`buildJudgeUserMessage(caseText, advocateBundle)`), call `callAgent()`, `parseJudgeOutput()` on
   success, then `insertVerdict()`, then emit `agent-done` (with `judgeResult` if parsing
   succeeded) / `agent-failed`.
6. **Finalize**: `sumRunUsage(caseId)` for the genuine token/cost totals, `status` derived from
   whether any/all calls failed, `finalizeCase()`, then emit `summary` → `run-done`.

`runPipeline()` itself only throws for something that makes the run *itself* impossible (e.g. the
database is unreachable) — every individual call's failure is caught inside `callAgent()`/`runOneAttempt()`
and surfaces as an `agent-failed` event plus a `failed: true` row, never a thrown exception that
would abort the whole run.

## Bundle construction — system vs. user role

Every OpenRouter call (`callAgent.ts`'s `runOneAttempt`) sends exactly two messages:
```ts
messages: [
  { role: "system", content: params.systemPrompt },  // whatever's currently configured — never touched
  { role: "user", content: params.userMessage },       // UserMessageBlock[], from lib/orchestrator/bundle.ts
]
```

**`system`** always carries the agent's currently-configured prompt verbatim — the teacher's
seeded default, or a Console user's edit. The orchestrator never modifies, wraps, or appends to it.

**`user`**, built by `bundle.ts`, is entirely the orchestrator's own construction — and, as of
2026-08-18, an **array of content blocks** (`UserMessageBlock[]`), not a plain string, so the
shared/repeated part of each bundle can be marked `cache_control: {"type": "ephemeral"}` for
OpenRouter's prompt caching (see "Prompt caching" below). Concatenating the blocks' `text` in order
reconstructs exactly the same text the original plain-string version produced — caching changed how
the content is *framed* for the request, not what it *says*.

- `buildAdvocateUserMessage(caseText)` → two blocks:
  1. **cacheable** — `Case:\n"""\n<caseText, trimmed>\n"""`
  2. uncached — `\n\nRespond with your argument for this case. Limit your answer to approximately
     1000 tokens (roughly 700-750 words) — the strongest, most focused form of your position, not
     padding or repetition.`
- `buildJudgeUserMessage(caseText, advocateOutputs)` → two blocks:
  1. **cacheable** — the case text *plus* all 4 labeled advocate sections:
     ```
     Case:
     """
     <caseText, trimmed>
     """

     Advocate arguments:

     --- Defense Advocate #1 ---
     <output, or the failure marker below>
     --- Defense Advocate #2 ---
     ...
     --- Prosecution Advocate #1 ---
     ...
     --- Prosecution Advocate #2 ---
     ...
     ```
  2. uncached — the render-verdict soft-length instruction + `JUDGE_TRAILER_INSTRUCTION`:
     ```
     Render your verdict. Limit your reasoning to approximately 500 tokens.

     After your reasoning, end your response with exactly these two lines, in this exact format
     (used for automated parsing of your decision — do not deviate from this format):
     VERDICT: <a short verdict label, e.g. "Guilty", "Not Guilty", or a specific charge>
     REASONS: <first reason> | <second reason> | <additional reasons, if any, each separated by |>
     ```
  A slot whose advocate call failed after all retries is substituted with:
  `"[ADVOCATE OUTPUT UNAVAILABLE — this call failed after repeated attempts. No argument was
  produced for this position. Treat this position as unargued, not as conceding.]"` — always
  present as a labeled section, never silently dropped, so all 4 slots are always visible to every
  judge regardless of any advocate failure.

The exact trailer text judges are asked for (`JUDGE_TRAILER_INSTRUCTION`, exported from
`bundle.ts`) is the single source of truth both for what's *asked* and for what `parseJudgeOutput.ts`
*parses* — kept in the same file specifically so the ask and the parse can't drift apart.

`call_log.userMessage` (the audit-trail column) stores the flattened string form
(`flattenUserMessageBlocks()`), not the block array — the request actually sent to OpenRouter uses
the blocks; the log stores what it *says*, for readability.

## Prompt caching (implemented 2026-08-18)

`cache_control: {"type": "ephemeral"}` on the first block of each bundle above, sent via
OpenRouter's content-blocks message format (`lib/openrouter/client.ts` + `callAgent.ts`'s
`runOneAttempt`, cast around the `openai` SDK's request type since `cache_control` isn't part of
its official content-part schema). No provider branching — the same block structure is sent
regardless of which model/provider ends up serving the call.

**Live-verified against real OpenRouter calls** (not just implemented against the docs):
- Works correctly when the provider supports it: a real, deliberately non-parallel test against
  `anthropic/claude-sonnet-4.5` showed an explicit cache write on call 1, then a cache hit
  (`cached_tokens` matching the write) on an identical call 2, with that second call's cost
  dropping ~11x.
- Harmless no-op when it isn't supported/routed: a full real run using `anthropic/claude-3-haiku`
  completed all 7 calls successfully with zero cache activity throughout, no errors.
- **Real caveat found in testing, not just theorized**: the 4 advocate calls (and separately the 3
  judge calls) are dispatched via `Promise.all`, exactly as the two-stage parallel design requires
  — and in a real run, all 3 parallel judge calls (identical cacheable bundle, same model) each
  independently *wrote* their own cache entry rather than one writing and the others reading it.
  Same-stage sibling calls racing each other appears to prevent the within-stage reuse the original
  design doc wording implied. See [ADR-0007](../docs/decisions/0007-parallel-calls-and-prompt-caching.md)'s
  2026-08-18 update and `docs/cost-budget.md` §7 for full detail — this doesn't make caching
  pointless (retries and later calls to the same model can still benefit), just narrower than
  originally worded.
- Scoped per model+provider: in "random per agent" mode, sibling calls usually land on different
  models, so cross-call reuse mostly won't fire — an accepted tradeoff of that mode, not a bug.

## Token budgets

From `lib/constants.ts`:

| | Soft target (`SOFT_LENGTH_TARGET`, in the user message) | Hard `max_tokens` cap (`HARD_MAX_TOKENS`) | Seeded default (`DEFAULT_MAX_TOKENS`) |
|---|---|---|---|
| Advocate | 1000 | 1300 | 1300 |
| Judge | 500 | 700 | 700 |

The hard cap is enforced via `clampMaxTokens(role, requested)`: `Math.min(Math.trunc(requested),
cap)`, falling back to the cap itself if `requested` isn't a finite positive number. Applied both
when saving a `PUT /api/agent-config/:role` edit and again inside `runPipeline()` right before each
OpenRouter call — so a value can never exceed the ceiling regardless of where it came from
(persisted config, or an unsaved value sent directly in a `POST /api/run` body).

## Retry logic and the call ceiling

`MAX_ATTEMPTS_PER_CALL = 3` (1 initial + 2 retries). `MAX_CALLS_PER_RUN = 21` (7 base calls × up to
3 attempts each, the absolute worst case if every one of the 7 needed all 3 attempts).

`callAgent()`'s loop, per logical call:
```
for attempt in 1..=3:
  if !reserveCallSlot(): break with "21-call-per-run budget was exhausted" as the final error
  run one attempt (streams live text only if attempt === 1)
  write a call_logs row for this attempt regardless of outcome
  if attempt succeeded: return success immediately
  else: remember the error, loop to the next attempt
return failure (only reached if all attempts failed or a slot couldn't be reserved)
```

`reserveCallSlot()` is a single closure-scoped counter shared across *all* 7 logical calls in a run
(defined once in `runPipeline()`, threaded into every `callAgent()` invocation) — so the ceiling is
a true run-wide budget, not a per-call sub-budget of 3. In practice a full run only hits anywhere
near 21 calls if most or all of the 7 calls need every retry.

A single attempt (`runOneAttempt`) is judged a success only if **both**: the streamed text is
non-empty after trimming, **and** the response included a `usage` object with numeric
`prompt_tokens`/`completion_tokens`/`total_tokens`. Either condition failing marks the attempt
`ok: false` with a specific `errorMessage` ("Model returned an empty response." /
"OpenRouter response did not include usable token-usage data.") — this is the concrete mechanism
behind the audit-and-reliability rule that a malformed response must never pass as a real result.
A network/timeout error (60s `AbortController` timeout) is caught and also treated as a failed
attempt, using the caught error's message.

## Judge output parsing

`parseJudgeOutput(rawOutput)` looks for exactly two lines via regex (`/^VERDICT:\s*(.+)$/im` and
`/^REASONS:\s*(.+)$/im`, matched anywhere in the text, case-insensitive, multiline). `REASONS` is
split on `|`, each segment trimmed, empty segments dropped. Returns `null` — not a guess, not a
default — if either line is missing, or if the verdict ends up empty, or if there are zero
non-empty reasons after splitting. A `null` result means `verdictLabel`/`reasons` are stored as
`null` on the `verdicts` document and the Console shows a distinct "No structured verdict parsed"
state rather than treating the call as failed (the call *succeeded*; only the format didn't match)
— see `VerdictsSummary`'s `verdictCardUnparsed` state in [`frontend.md`](frontend.md).

## The placeholder-prompt situation

**None of the 7 teacher-provided system prompts have been received.** `prompts/index.ts`'s
`PROMPT_SEED` maps every one of the 7 roles to `placeholderPrompt(role)` from
`prompts/placeholder.ts` — a generated string that explicitly says `"TEACHER-PROVIDED SYSTEM
PROMPT — NOT YET RECEIVED. Replace verbatim before running for real."` plus the role's stance
description. This is the value every `agent_configs` document is seeded with at boot
(`lib/db/setup.ts`), and thus what any run uses unless a human first pastes real text into the
Console and saves it (`PUT /api/agent-config/:role`). Running the pipeline with these placeholders
in place will produce low-quality or off-topic advocate/judge output — an intentional signal that
real prompts haven't been loaded, not a defect in the orchestration code. See
`prompts/placeholder.ts`'s and `prompts/index.ts`'s header comments for the explicit instruction to
replace the seed content directly, never to "guess" real prompt text in code.

## Model-selection modes (added 2026-08-18)

Two modes exist in the Console, both operating purely through the existing `PUT
/api/agent-config/:role` endpoint — there is no separate "mode" field or endpoint on the backend;
mode is entirely client-side state in `app/page.tsx` (`ModelSelectionMode = "single" | "random"`).

- **`"single"`** — picking a model from `ModelSelector`'s dropdown *is* the apply action: it
  immediately issues `PUT /api/agent-config/:role` for all 7 roles with that one `model`, in
  parallel (`Promise.allSettled`). A per-role save failure is surfaced individually (that role's
  `saveState` flips to `"failed"`) without blocking the other 6.
- **`"random"`** — does not touch any config when the mode is selected. Instead, `rerollRandomModels()`
  runs **immediately before every `Run` press** (not on mode switch): for each of the 7 roles,
  independently picks `models[Math.floor(Math.random() * models.length)]` from the curated list
  (`GET /api/models`'s response) and `PUT`s it. The freshly-saved configs returned from these PUTs
  — not the possibly-stale React state — are what's used to build that run's `POST /api/run` body,
  since the reroll's state updates aren't guaranteed to have landed in the closure yet by the time
  the request is built.
- If `modelMode === "random"` and the curated model list failed to load, Run is blocked client-side
  (`blockReason` in `app/page.tsx`) with `"The curated model list isn't available — required to
  re-roll random models before running."` — the backend has no equivalent check of its own, since
  `POST /api/run` always receives concrete `model` strings already resolved by the client.

## Discrepancy: prompt caching is not implemented — RESOLVED 2026-08-18

Was a real gap: `docs/architecture.md` §2, `docs/cost-budget.md`, `docs/rules/cost-and-
performance.md`, and [ADR-0007](../docs/decisions/0007-parallel-calls-and-prompt-caching.md) all
described prompt caching on the shared case text, but the request built in `callAgent.ts`'s
`runOneAttempt()` sent a plain two-message array with no `cache_control` field anywhere — every
call paid full price for the case text every time, as this note originally flagged.

Now implemented and live-verified against real OpenRouter calls — see the "Prompt caching" section
above (and `docs/cost-budget.md` §7 / ADR-0007's 2026-08-18 update for the full detail, including a
real caveat found in testing: same-stage parallel sibling calls generally don't reuse each other's
cache write, which the original documentation didn't anticipate). Not re-scoped away — actually
built, and the docs corrected to describe what was actually verified rather than what was assumed.
