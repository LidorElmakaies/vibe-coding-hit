# Project Overview

## What it is

The Tribunal is a reusable web app that simulates an AI courtroom. A user submits a case (free-form
"charge sheet" text — defendant, act, and the exact question for the Tribunal to decide) through a
single-page UI. The app runs 7 independent, single-shot LLM calls through OpenRouter: 4 advocates
(2 arguing innocent, 2 arguing guilty) each produce one argument from the case alone, then 3 judges
each independently read the case plus all 4 arguments and render a verdict. All 7 calls, their
outputs, token/cost/timing data, and the resulting verdicts are persisted to MongoDB so a run can
be reopened and re-read later from a past-runs history list.

This is a class project for a course on agentic software engineering. Per
[`CLAUDE.md`](../CLAUDE.md) §1: **the graded deliverable is demonstrated skill directing multiple
agents through the build**, not the courtroom app's sophistication as a product. The app is
intentionally minimal engineering wrapped around 7 LLM calls, not a large codebase.

## Who it's for

From [`docs/framing.md`](../docs/framing.md) §2 (stakeholder list) — restated in current-state
terms:

- **The student** — builds and directs the work; graded on how well the agents were directed, not
  on the app alone.
- **The teacher** — supplies the case input and (not yet delivered, see below) all 7 system
  prompts; is the actual approver of "done."
- **The 4 advocate agents** (as design artifacts, not people) — their prompts are the teacher's
  authorship; the codebase's job is to run them correctly and never corrupt or edit their content.
- **A future reader of the audit trail** — anyone opening `call_logs`/`advocate_outputs`/`verdicts`
  for a past case needs to be able to reconstruct exactly what was asked and what came back,
  without having watched the run happen.
- **Whoever runs the app end-to-end** — submits a case via the Console, reads back the verdicts,
  can find it again later in the past-runs list.

## Definition of done (from `docs/framing.md` §3, checked against the real code)

1. All 4 advocate agents produce a single-shot output using their configured system prompt,
   arguing their assigned stance. **Implemented** — `lib/orchestrator/runPipeline.ts` stage 1,
   `ADVOCATE_ROLES` in `lib/constants.ts`.
2. All 3 judges independently receive the full bundle (case + all 4 advocate outputs) and produce
   a verdict. **Implemented** — `lib/orchestrator/bundle.ts`'s `buildJudgeUserMessage` always
   includes all 4 advocate slots (with an explicit "[ADVOCATE OUTPUT UNAVAILABLE...]" marker for a
   slot that failed after retries, never a silent omission).
3. Every one of the 7 calls has a persisted audit-trail record (model, prompt, output, tokens,
   cost, time). **Implemented** — one `call_logs` document per attempt, written from
   `lib/orchestrator/callAgent.ts`; see [`data-model.md`](data-model.md).
4. A human can find and re-read each of the 7 outputs after the run ends. **Implemented** —
   `GET /api/cases/:id` returns every advocate output and verdict for a past case; the Console's
   past-runs panel opens it read-only.
5. The OpenRouter key is never exposed to anything untrusted; system prompt text is deliberately
   *not* covered by this rule anymore (per ADR-0014). **Implemented** — `OPENROUTER_API_KEY` is
   read only in `lib/openrouter/client.ts`, server-side, never returned in any API response; prompt
   text flows freely through `GET/PUT /api/agent-config` by design.
6. A case can be submitted through a browser form, and the resulting opinion is shown back and
   stored for later retrieval. **Implemented** — `app/page.tsx` + `POST /api/run` + `GET /api/cases`.
7. Total tokens used per run is calculated from OpenRouter's real `usage` data and persisted, not
   estimated. **Implemented** — `lib/db/queries.ts`'s `sumRunUsage` aggregates `call_logs.totalTokens`/
   `costUsd` (`status: "success"` only) and `runPipeline.ts` calls it once per run to populate
   `cases.totalTokens`/`totalCostUsd`.

All 7 items above have real code satisfying them. What's **not yet real** is the content the
pipeline runs on:

## Current status — built vs. still open

**Built and exercised end-to-end** (per `docs/architecture.md` §6's confirmed items): the full
MongoDB Atlas schema, the two-stage parallel orchestrator, the SSE streaming transport, the Console
UI, the Docker image, and the AWS App Runner production deployment with GitHub Actions CI/CD on
push to `main`.

**Still open / placeholder, as of this writing:**

- **The 7 teacher-provided system prompts have not been received.** Every `agent_configs` document
  is seeded from `prompts/placeholder.ts`'s `placeholderPrompt()` — inert marker text that
  identifies itself as "TEACHER-PROVIDED SYSTEM PROMPT — NOT YET RECEIVED," not real argument or
  judging instructions. A run today will produce low-quality/off-task advocate and judge output by
  design — that's the intended signal that real prompts haven't been loaded, not a pipeline bug.
  Whoever runs the app for real must paste the teacher's real text into each of the 7 Console
  panels and save it before a run is meaningful (or replace the corresponding constant in
  `prompts/placeholder.ts`'s callers).
- **No default OpenRouter model has been deliberately chosen.** `lib/constants.ts`'s `DEFAULT_MODEL`
  (`openai/gpt-4o-mini`) is a placeholder seed pick, not a cost/quality-considered decision. The
  *mechanism* for choosing (per-agent, single/random, via the Console) is finished; the *default*
  itself is not.
- **Prompt caching is not implemented**, despite being part of the design in `docs/architecture.md`
  §2, `docs/cost-budget.md` §3, and [ADR-0007](../docs/decisions/0007-parallel-calls-and-prompt-caching.md).
  See [`agent-pipeline.md`](agent-pipeline.md) for detail.
- **Local dev vs. production database separation** is unresolved (`docs/architecture.md` §6): both
  currently point at the same `MONGODB_URI`/database name unless operators configure otherwise.
- **`AutoDeploymentsEnabled` is `false`** on the App Runner service itself — the GitHub Actions
  workflow is what actually triggers redeploys on push to `main` (`aws apprunner start-deployment`),
  not App Runner's own auto-deploy-from-registry setting. See [`deployment.md`](deployment.md).

## Out of scope (from `docs/framing.md` §4)

Multi-turn debate between agents; editing/authoring any of the 7 system prompts ourselves; a
general-purpose legal-advice product; fine-tuning/training a model; user accounts, auth, or
multi-user access control. All confirmed unchanged in the current code — every agent call in
`lib/orchestrator/callAgent.ts` is a single non-conversational `chat.completions.create`, and there
is no auth/session code anywhere in `app/`.
