# specs/ — Current-State Technical Reference

The Tribunal (agnet-project) is a Next.js/TypeScript web app that runs an AI courtroom simulation:
a submitted case ("charge sheet") is argued by 4 single-shot advocate agents (2 defense, 2
prosecution) and ruled on by 3 single-shot judge agents, all called through OpenRouter, with every
call's inputs/outputs/tokens/cost persisted to MongoDB Atlas as an audit trail. The entire UI is
one page (`app/page.tsx`, "the Console"): submit a case, configure and run the 7 agents, read the
3 verdicts, and browse past runs.

## What's in this folder

Eight files, each describing what the system **actually is and does today**, written directly
from the source in `lib/`, `app/api/`, `components/console/`, and the deployment/CI files — not
from memory of what such a system typically looks like, and not copied from `docs/`.

| File | Covers |
|---|---|
| [`project-overview.md`](project-overview.md) | What/why/who, definition of done, current status: built-and-verified vs. still-placeholder |
| [`architecture.md`](architecture.md) | The four-part architecture (browser/backend/database/deployment), real component list, data flow, trust boundary |
| [`data-model.md`](data-model.md) | Every MongoDB collection, every field and type, indexes, seeding, the audit-trail snapshot mechanism |
| [`api.md`](api.md) | All 5 API routes — path, method, request/response shapes, status codes, the SSE event protocol |
| [`agent-pipeline.md`](agent-pipeline.md) | The 7-agent orchestration: two-stage parallel execution, bundle construction, retries, the 21-call ceiling, judge output parsing, model-selection modes |
| [`frontend.md`](frontend.md) | The Console UI: every component, page layout/hierarchy, panel state machine, color palette |
| [`deployment.md`](deployment.md) | Local dev, production (AWS App Runner via ECR), CI/CD, environment variables, real problems hit and fixed |

## How this relates to `docs/`

This project already has a `docs/` folder; `specs/` is deliberately not a duplicate of it:

- **`docs/decisions/*.md` (ADRs)** — the *historical* record: what options were weighed, what was
  chosen, and why, at the moment each decision was made. Read these to understand *why* the system
  looks the way it does, or what alternatives were rejected. `specs/` never repeats that reasoning
  — it only cites an ADR by number when useful context, then moves on.
- **`docs/rules/*.md`** — the *constraints* this project must keep satisfying (audit trail shape,
  secrets boundary, cost caps, etc.), derived from the course's modules. `specs/` describes how the
  current code satisfies (or, where noted, doesn't yet fully satisfy) those constraints — it
  doesn't restate the constraints themselves as rules.
- **`docs/architecture.md`, `docs/cost-budget.md`, `docs/interface-brief-console.md`, `docs/framing.md`,
  `docs/deployment-runbook.md`** — mostly *forward-looking or in-progress* documents: architecture
  sketches, budgets set before real usage data existed, an interface brief written to guide the
  build, a runbook written from one deployment's real steps. `specs/` cross-checked all of these
  against the real, current source and notes any place where the code and an existing doc now
  disagree (see each file's "Discrepancies" notes, most concentrated in `agent-pipeline.md` and
  `deployment.md`).
- **`specs/`** — the current-state reference: what the system *actually is*, as of the code that
  exists right now. If the code changes, `specs/` is what should be re-derived and updated; it is
  not meant to accumulate its own decision history the way `docs/decisions/` does.

## Known discrepancies between the code and existing `docs/` (see the relevant file for detail)

- **Prompt caching**: `docs/architecture.md` §2, `docs/cost-budget.md` §3, `docs/rules/cost-and-performance.md`,
  and [ADR-0007](../docs/decisions/0007-parallel-calls-and-prompt-caching.md) all describe prompt
  caching on the shared case text as part of the design. The actual call site
  (`lib/orchestrator/callAgent.ts`) sends a plain `messages` array with no cache-control field and
  no OpenRouter caching parameter — prompt caching is not implemented in the code as it stands. See
  [`agent-pipeline.md`](agent-pipeline.md).
- **Model default**: `lib/constants.ts`'s `DEFAULT_MODEL` (`openai/gpt-4o-mini`) is a placeholder
  seed value, not a considered choice — consistent with `docs/architecture.md` §6 flagging this as
  still open, but worth restating here since a `specs/` reader might otherwise assume it's final.
- **The 7 teacher-provided system prompts have not been received** — every seeded prompt is
  `prompts/placeholder.ts`'s inert placeholder text, not real prompt content. See
  [`project-overview.md`](project-overview.md) and [`agent-pipeline.md`](agent-pipeline.md).
