# CLAUDE.md — Project Idea & Rules

> Read this file first, before touching any code. This is the single top-level entry point for
> every agent (human-directed or Claude sub-agent) working on this repo. Deeper docs live under
> `docs/` and `.claude/` (see "Documentation Map" below) — this file stays short and points to them.

## 1. What This Project Is

A class project for a course on **agentic software engineering** ("vibe coding"). The assignment,
as set by the teacher: build an AI courtroom simulator — internally, this is the course's own
running example, referred to in the course materials as **"the Tribunal"** — that takes a
submitted criminal case, debates it using multiple independent LLM agents, and has a judge panel
rule on it. It's a reusable web app (submit a case, browse past cases), not a one-off script over
a single fixed case — confirmed via [Module 7](docs/modules/module7-web-application-architecture.md).

**The real grading target is not the courtroom app — it's demonstrated skill at designing,
structuring, and directing multiple agents.** Keep the implementation simple. Prefer a small,
clearly-reasoned agent design over a large, impressive-looking codebase. Every module taught in
class adds rules/techniques we are expected to actually apply here (see §4).

## 2. Project Concept: AI Courtroom Simulator

**Input:** the court problem — a submitted case describing what happened, in full. **Output:**
the 3 judges' verdicts — that's the project's deliverable, not the advocate arguments (those are
intermediate work product the judges need, not the end goal).

Teacher provides **all 7 system prompts** (4 advocates + 3 judges) — we never author new prompt
content ourselves. We provide the orchestration, backend, frontend, database, and verification
that runs them correctly and shows the result legibly.

**2026-08-17 reversal — read before assuming prompts are backend-only:** the teacher's text is
still the loaded **default** for every agent, but it's now **editable per agent, directly on the
single page that is this project's entire UI** ("the Console" —
[ADR-0015](docs/decisions/0015-single-page-console-ui.md); there is no separate admin/public
split, one page for everyone) — model choice and each agent's output-token limit are editable
there too. This deliberately reverses the original "system prompts never reach the browser, never
edited" rule; see [ADR-0014](docs/decisions/0014-editable-agent-config-admin-console.md) for the
full reasoning and what stays fixed (the OpenRouter key is **not** part of this reversal — it
never reaches the browser, full stop).

### Agent Roles

| Agent | Count | Stance | Prompt default | Mode |
|---|---|---|---|---|
| Defense | 2 | Argue INNOCENT (justify the killing / argue lack of intent) | **Teacher-provided, editable per run via the Admin Console** | Single-shot: one system prompt → one response. No conversation, no memory. |
| Prosecution | 2 | Argue GUILTY (and of what specific charge) | **Teacher-provided, editable per run via the Admin Console** | Single-shot, same constraints |
| Judge | 3 | Reads all 4 arguments + the case, renders a verdict | **Teacher-provided, editable per run via the Admin Console** | Single-shot |

### Pipeline

```
Court problem (the case: what happened, in full)
   │
   ├──> Defense #1   (teacher-provided system prompt A)
   ├──> Defense #2   (teacher-provided system prompt B)
   ├──> Prosecution #1 (teacher-provided system prompt C)
   └──> Prosecution #2 (teacher-provided system prompt D)
         │  (all 4 run independently/in parallel — no shared context between them)
         ▼
   Bundle = case text + all 4 advocate outputs
         │
         ├──> Judge #1 (teacher-provided system prompt)
         ├──> Judge #2 (teacher-provided system prompt)
         └──> Judge #3 (teacher-provided system prompt)
               (each judge runs independently, no cross-talk)
         ▼
   3 verdicts = PROJECT OUTPUT
```

### Assignment Constraints (project-defining, not module-derived)

- Advocate agents (defense/prosecution) are single-prompt only. No multi-turn, no tool use,
  no shared memory between them.
- **We never author new content for any of the 7 system prompts ourselves** — the teacher's text,
  verbatim, is the default loaded for every agent. Whether the 2 defense/2 prosecution prompts
  embody distinct strategies is the teacher's authorship call, not ours — if two ever read as
  near-duplicates, we flag it; we do not rewrite them ourselves.
- **The person running the Admin/Run Console may edit any agent's current prompt text, model, or
  output-token limit before a run** — see [ADR-0014](docs/decisions/0014-editable-agent-config-admin-console.md).
  This is a deliberate, user-directed reversal of the earlier "backend-only, immutable" rule, not
  us quietly rewriting the teacher's words in code. Whatever text is actually in effect for a call
  gets recorded on that call's audit-trail row (see
  [`docs/rules/audit-and-reliability.md`](docs/rules/audit-and-reliability.md)), so a run stays
  reconstructable even after the default is edited again later.
- **The OpenRouter API key is not part of that reversal** — it never reaches the browser, never
  becomes editable UI state, full stop. See
  [`docs/rules/security-and-permissions.md`](docs/rules/security-and-permissions.md).
- Judges must receive the full bundle (case + all 4 outputs), never a partial view.
- **Every run calculates and persists total tokens used, from real OpenRouter `usage` data** —
  not estimated. Added 2026-08-14. See [`docs/cost-budget.md`](docs/cost-budget.md).
- Keep the stack minimal. Don't add infrastructure that doesn't serve the learning goal.
- Keep [`docs/framing.md`](docs/framing.md) current — it's what a disputed decision gets checked
  against; update it when reality corrects it, don't let it go stale. *(Module 6)*

### Engineering Discipline (module-derived rules)

The rule list was split into topic files once it outgrew a flat list (this pass, at Modules 8–9).
Each file below is short and each rule is tagged with the module(s) it came from — read them
before touching the relevant part of the build:

- [`docs/rules/agent-design.md`](docs/rules/agent-design.md) — definition-of-done from intent,
  anti-sycophancy, no-agent-grades-its-own-work, prompts-as-code, model-matched-to-difficulty, the
  5-part spec structure + commit points/drift detection *(Modules 2, 3, 4, 5, 9, 10)*
- [`docs/rules/security-and-permissions.md`](docs/rules/security-and-permissions.md) — tool
  boundaries over prompt wording, do-less-when-uncertain, secrets never reach the browser
  *(Modules 3, 5, 7)*
- [`docs/rules/audit-and-reliability.md`](docs/rules/audit-and-reliability.md) — the audit-trail
  requirement and its concrete fields, never let a model failure pass through silently
  *(Modules 4, 7, 8, 9)*
- [`docs/rules/cost-and-performance.md`](docs/rules/cost-and-performance.md) — parallelize
  independent calls, prompt caching, economic blast-radius cap *(Module 9)*
- [`docs/rules/interface-and-docs.md`](docs/rules/interface-and-docs.md) — the four-part interface
  spec, documentation commissioned as a brief, descriptive vs. explanatory docs *(Module 8)*
- [`docs/rules/context-and-docs-hygiene.md`](docs/rules/context-and-docs-hygiene.md) — write
  context files by hand, keep `CLAUDE.md` short, curate don't kitchen-sink, hooks over advice for
  what must never happen *(Module 11 — about this repo's own docs, see that module's write-up)*

## 3. Tech Stack Decisions

- **LLM provider: OpenRouter** for all agent calls (defense, prosecution, judges) — not calling
  OpenAI/Anthropic APIs directly. Lets us pick/mix models per agent.
- **Framework: Next.js (TypeScript), web only.** One project holds both the frontend (React UI)
  and the backend (Route Handlers) — see [ADR-0009](docs/decisions/0009-fullstack-nextjs-typescript.md).
- **Agent calls: the official `openai` SDK pointed at OpenRouter's base URL** — not LangChain. See
  [ADR-0010](docs/decisions/0010-raw-sdk-not-langchain.md).
- **Database: MongoDB Atlas** (hosted, remote) — not Supabase/Postgres (ADR-0011 superseded). Same
  connection string (`MONGODB_URI`) for local dev and production; no local DB container needed.
  See [ADR-0017](docs/decisions/0017-mongodb-atlas-database.md).
- **Deployment: Docker Compose locally; AWS App Runner for production** — not Vercel (ADR-0012
  superseded), not Render (ADR-0013's production half superseded 2026-08-17). One Dockerfile for
  both, deployed to App Runner via Amazon ECR; database stays Supabase-hosted Postgres regardless
  (ADR-0011 unaffected). See [ADR-0013](docs/decisions/0013-docker-compose-local-render-production.md)
  (local dev, still current) and [ADR-0016](docs/decisions/0016-aws-app-runner-production.md)
  (production hosting).
- Package manager: npm (ships with Node, no reason to add another tool for this project's size).

## 4. Class Structure

The class is taught in **modules** (19 total, 4 parts — see `docs/modules/module1-...md` §1 for
the full syllabus map). Each gets a file under `docs/modules/` with the full write-up and how it
applies here; this list stays a one-line index only (kept short per the Module 11 rule below).

- [Module 1 — What Is Agentic Software Engineering?](docs/modules/module1-what-is-agentic-software-engineering.md) — equip/verify framing, autonomy scale, grading targets agent-direction. No new rule.
- [Module 2 — The Human Role](docs/modules/module2-the-human-role.md) — erode/hold/compound skills, non-delegable accountability.
- [Module 3 — Mental Models of Agents](docs/modules/module3-mental-models-of-agents.md) — agent = model+tools+loop; context/tools/plan/failure-modes/jagged-frontier.
- [Module 4 — Anatomy of an Agentic Workflow](docs/modules/module4-anatomy-of-agentic-workflow.md) — seven parts; engineering vs. craft hinges on the audit trail.
- [Module 5 — The ADE Typology](docs/modules/module5-ade-typology.md) — six pillars, three surfaces, minimal-footprint permissions.
- [Module 6 — Intent and Problem Framing](docs/modules/module6-intent-and-problem-framing.md) — produced `docs/framing.md`. **Real build starts here per the course.**
- [Module 7 — Web Application Architecture](docs/modules/module7-web-application-architecture.md) — produced `docs/architecture.md`. Confirmed: this project *is* the course's "Tribunal."
- [Module 8 — Interface Design & Documentation](docs/modules/module8-interface-design-and-documentation.md) — produced the interface + documentation briefs.
- [Module 9 — Cognified Software & Agent Economics](docs/modules/module9-cognified-software-and-agent-economics.md) — real cost/latency numbers for our 7-call shape.
- [Module 10 — Specification & the Co-Evolution Spiral](docs/modules/module10-specification-and-co-evolution-spiral.md) — 5-part spec structure, commit points, drift detection.
- [Module 11 — Context Engineering](docs/modules/module11-context-engineering.md) — **directly about how we've been building this repo's docs**; new rules file + this trim.

Full changelog of what each module added: [`docs/decisions-log.md`](docs/decisions-log.md).

## 5. Documentation Map

- `CLAUDE.md` — this file: project idea + global rules (start here)
- `docs/decisions/` — **planning record**: each major decision, the options weighed, and why we
  picked what we picked over the alternatives — this is the visible "directing the agent" trail
  for grading, see the index at `docs/decisions/README.md`
- `docs/framing.md` — problem statement, stakeholders, definition of done, out-of-scope (Module 6)
- `docs/architecture.md` — system architecture, first draft (Module 7, updated Module 9)
- `docs/rules/` — module-derived engineering rules, split by topic (see §2 above)
- `docs/interface-brief-console.md` — interface brief for **the Console, the entire UI** (one
  single page: case input, per-agent model/prompt/token-limit editing, run, live streaming,
  results, cost/tokens/time summary, past-runs history) — added 2026-08-17, supersedes the two
  below, per [ADR-0015](docs/decisions/0015-single-page-console-ui.md)
- `docs/interface-brief-opinion-screen.md` — *superseded, kept for reference* — original results-screen brief
- `docs/interface-brief-admin-console.md` — *superseded, kept for reference* — original (incorrect) admin/public-split brief
- `docs/documentation-brief-backend-orchestrator.md` — documentation brief for the orchestrator (Module 8)
- `docs/cost-budget.md` — per-agent token budget, retry/blast-radius cap, cost estimate method
- `docs/deployment-runbook.md` — step-by-step AWS App Runner deploy procedure, incl. the real
  problems hit (HOSTNAME override, secret-printing gotcha) and how to redeploy after a code change
- `docs/summary.md` — project summary *(not yet created)*
- `docs/ideas.md` — brainstorm/backlog, incl. advocate agent strategy angles *(not yet created)*
- `docs/modules/` — one file per class module, mapped onto this project
- `docs/decisions-log.md` — full chronological changelog (moved out of this file, Module 11)
- `.claude/agents/backend.md`, `frontend.md`, `testing.md`, `devops.md` — the actual sub-agent
  definitions (persona + job + guidance), doubling as each role's rules doc. A separate
  `docs/agents/*.md` was planned but dropped as duplicative once these existed.
- `.claude/agent-teams.md` — how to use Claude Code's agent-teams feature in this project, and a
  skill to activate it during coding work *(planned, not yet created — ref:
  https://code.claude.com/docs/en/agent-teams)*
- `.claude/skills/` — Claude Code skills for this project

## 6. Open Questions

- [ ] OpenRouter API key — obtained yet? Storage convention (`.env.local` for Next.js)?
- [ ] Which model(s) via OpenRouter, per agent or shared?
- [ ] The actual case text used for a given run — user-submitted per Tribunal scope (§2), but is
      there still one canonical teacher-supplied case to seed/demo with? (placeholder until
      provided).
- [ ] Teacher's 7 system prompts — all of them, not just the judges' (not received yet; will seed
      the Admin Console's default values once provided, per ADR-0014).
- [ ] Actual Render service configuration — deliberately future work, see ADR-0013.
- [ ] **Have you personally read/edited `CLAUDE.md` and `docs/rules/*.md` yet?** Per Module 11,
      unreviewed assistant-drafted context files measurably underperform hand-written ones — most
      of this repo's docs have been drafted by me and approved in bulk rather than you.

**Resolved (2026-08-17):**
- ~~Whether to vary the OpenRouter model per call, or keep one shared model?~~ **Mechanism
  decided: user-configurable per agent, via the Admin Console** (ADR-0014) — no longer a fixed
  choice baked into code. The exact default model(s) it starts on is still an open call.

**Resolved:**
- ~~Is "the Tribunal" this project's actual target shape?~~ **Yes, confirmed** — see §1/§4 and
  `docs/framing.md`/`docs/architecture.md`.
- ~~Is a frontend required?~~ **Yes** — a browser submission form + results view + past-cases
  list, per the confirmed Tribunal scope.
- ~~Desired output format?~~ **Browser display + persisted DB record** (case, all 7 outputs, call
  log), retrievable later via the past-cases list.
- ~~Backend language/runtime? Frontend framework? LangChain or not?~~ **Next.js (TypeScript), raw
  `openai` SDK against OpenRouter, Supabase (Postgres)** — see §3 and ADRs 0009–0011.
- ~~Deployment target?~~ **Docker Compose locally; Render for production (future)** — see §3 and
  ADRs 0012 (superseded)/0013.
- ~~Exact hard-cap value for calls-per-deliberation?~~ **21 calls/run** (7 base × up to 3 attempts
  each) — see [`docs/cost-budget.md`](docs/cost-budget.md) §5.
- ~~What exactly the testing agent should verify?~~ Specified directly in
  `.claude/agents/testing.md`: `docs/framing.md` §3 item-by-item, the audit trail, the interface
  brief's required states, the secrets rule, and failure-visibility.

## 7. Decisions Log

Moved to [`docs/decisions-log.md`](docs/decisions-log.md) (Module 11: keep this root file short —
history isn't a standing rule, it doesn't need to load every session). Add entries there, not here.

## 8. Assistant Memory

All durable facts/preferences/decisions for this project are kept **inside this repo only**,
under [`.claude/memory/`](.claude/memory/MEMORY.md) — never in Claude Code's global per-machine
memory store. At the start of a session, read `.claude/memory/MEMORY.md` first. When something
durable comes up, write/update a file there (same frontmatter convention as Claude Code's global
memory) instead of the global store. This section is what makes that rule self-enforcing, since
`CLAUDE.md` is auto-loaded every session.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
