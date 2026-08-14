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

Teacher provides **all 7 system prompts** (4 advocates + 3 judges) — we do not author or edit any
of them. We provide the orchestration, backend, frontend, database, and verification that runs
them correctly and shows the result legibly.

### Agent Roles

| Agent | Count | Stance | Prompt authored by | Mode |
|---|---|---|---|---|
| Defense | 2 | Argue INNOCENT (justify the killing / argue lack of intent) | **Teacher-provided — we don't author or edit these** | Single-shot: one system prompt → one response. No conversation, no memory. |
| Prosecution | 2 | Argue GUILTY (and of what specific charge) | **Teacher-provided — we don't author or edit these** | Single-shot, same constraints |
| Judge | 3 | Reads all 4 arguments + the case, renders a verdict | **Teacher-provided — we don't author or edit these** | Single-shot |

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
- **We do not write or edit any of the 7 system prompts** (4 advocates + 3 judges) — all come
  from the teacher, verbatim, before a run. Whether the 2 defense/2 prosecution prompts embody
  distinct strategies is the teacher's authorship call, not ours — if two ever read as
  near-duplicates, we flag it; we do not rewrite them ourselves.
- Judges must receive the full bundle (case + all 4 outputs), never a partial view.
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
- Everything else (language, frontend/backend framework, hosting) — **not yet decided**. Will be
  recorded here once chosen.

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
- `docs/interface-brief-opinion-screen.md` — interface brief for the results screen (Module 8)
- `docs/documentation-brief-backend-orchestrator.md` — documentation brief for the orchestrator (Module 8)
- `docs/summary.md` — project summary *(not yet created)*
- `docs/ideas.md` — brainstorm/backlog, incl. advocate agent strategy angles *(not yet created)*
- `docs/agents/backend.md` — backend agent's rules & responsibilities *(not yet created)*
- `docs/agents/frontend.md` — frontend agent's rules & responsibilities *(not yet created)*
- `docs/agents/testing.md` — testing agent's rules & responsibilities *(not yet created)*
- `docs/agents/devops.md` — devops agent's rules (deploy + test) *(not yet created)*
- `docs/modules/` — one file per class module, mapped onto this project
- `docs/decisions-log.md` — full chronological changelog (moved out of this file, Module 11)
- `.claude/agent-teams.md` — how to use Claude Code's agent-teams feature in this project, and a
  skill to activate it during coding work *(planned, not yet created — ref:
  https://code.claude.com/docs/en/agent-teams)*
- `.claude/agents/` — Claude Code sub-agent definitions for this project (frontend/backend/testing/devops)
- `.claude/skills/` — Claude Code skills for this project

## 6. Open Questions

- [ ] OpenRouter API key — obtained yet? Storage convention (`.env`)?
- [ ] Which model(s) via OpenRouter, per agent or shared?
- [ ] Backend language/runtime?
- [ ] The actual case text used for a given run — user-submitted per Tribunal scope (§2), but is
      there still one canonical teacher-supplied case to seed/demo with? (placeholder until
      provided).
- [ ] Teacher's 7 system prompts — all of them, not just the judges' (not received yet).
- [ ] What exactly the testing agent should verify.
- [ ] Exact hard-cap value for calls-per-deliberation (economic blast radius, Module 9).
- [ ] Whether to vary the OpenRouter model per call (cheaper for advocates, more capable for
      judges, per Module 9's "match capability to difficulty") or keep one shared model for
      simplicity — a deliberate choice still to make, not yet decided either way.
- [ ] **Have you personally read/edited `CLAUDE.md` and `docs/rules/*.md` yet?** Per Module 11,
      unreviewed assistant-drafted context files measurably underperform hand-written ones — most
      of this repo's docs have been drafted by me and approved in bulk rather than line-edited by
      you. Not urgent, but the highest-leverage open item per that module's own claim.

**Resolved:**
- ~~Is "the Tribunal" this project's actual target shape?~~ **Yes, confirmed** — see §1/§4 and
  `docs/framing.md`/`docs/architecture.md`.
- ~~Is a frontend required?~~ **Yes** — a browser submission form + results view + past-cases
  list, per the confirmed Tribunal scope.
- ~~Desired output format?~~ **Browser display + persisted DB record** (case, all 7 outputs, call
  log), retrievable later via the past-cases list.

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
