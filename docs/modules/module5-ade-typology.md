# Module 5 — The ADE Typology: Tooling and Permissions

> Source: `lessons/ASE26 lesson 3.pptx` (ASE-26, Lesson 3, 21.07.2026), slides 14–32 + the module
> description given in chat. ADE = "agentic development environment."

## 1. The Six-Pillar Architecture

Any ADE can be described by which of these it implements, and how:

| Pillar | What it does | Note from the deck |
|---|---|---|
| **Bare model** | The LLM alone — no tools, no memory beyond the prompt, text in → text out | Every other pillar is an addition on top of this foundation. |
| **Tool augmentation** | Gives the model tools to act: read files, run commands, search the project | **This is what turns a model into an agent.** The exact tools granted fixes both the agent's reach *and* its blast radius — same mechanism, two names. |
| **Knowledge & memory** | Carries information across separate sessions (project standards, history) | Simplest form: a file loaded every session (e.g. our `CLAUDE.md`). Richer form: a searchable knowledge store. Without it, every session starts empty. |
| **Learning from experience** | Changes the agent's behavior *because of* past sessions, not just recalls facts | Memory recalls; learning alters future conduct. Called out as "the least settled of the six" — claims that an ADE "learns" deserve close reading/skepticism. |
| **Multi-agent coordination** | Runs several agents together in defined roles | One task divided among specialists; one agent independently checking another's work. **The independence is the whole point — a single agent approving its own work is no real check at all.** |
| **Computer use** | The agent operates a screen directly: pointer, clicks, typing into applications | Reaches tasks no code tool could touch — but its blast radius grows as wide as its reach, and its mistakes can occur almost anywhere a person's could. |

## 2. Three Surfaces an ADE Places Itself On

Each is a different stance on transparency vs. convenience — and per the deck, **a choice about
transparency is also a choice about where human responsibility sits**, because a developer who
can't see what the agent is doing has no way to verify it:

| Surface | Trade-off |
|---|---|
| **Command line** | Exposes the agent loop directly; fullest control over tools/permissions; actions visible one at a time. Value: transparency. Price: the engineer manages every detail. |
| **Editor (IDE-integrated)** | Embeds the agent where work already happens; less friction, less visibility into the agent's inner loop. "For ordinary work this is a good bargain." |
| **Builder (browser-based)** | Hides the architecture almost entirely — state a want, receive a result. Least transparency, greatest convenience/speed. |

*(Claude Code, our course-standard ADE, spans the first two — usable standalone/terminal, which
the course explicitly prefers, or IDE-integrated, which is how it's running for this project.)*

## 3. Permission Design: The Minimal-Footprint Principle

Permission design and sandboxing are framed as **engineering decisions, not settings to click
through**. The tools an agent can reach define its **blast radius** — the scope of harm if it acts
wrongly. Governing principle, stated in three parts:
1. Grant only the permissions the task requires.
2. Prefer reversible actions to irreversible ones.
3. **Do less when uncertain.**

(Parts 1–2 were already captured as a rule from Module 3; part 3 — "do less when uncertain" — is
new and sharpens it, see §4.)

## 4. The Seven-Question ADE Checklist

A durable habit for reading *any* new ADE, not just today's tools:
1. Which **pillars** (§1) does it implement?
2. Which **surface** (§2) does it occupy?
3. What's its default **blast radius**?
4. What **sandboxing** does it offer (a boundary the agent cannot cross)?
5. What **audit-trail** mechanisms are built in (does the record survive by itself)?
6. How does it handle **context** (does project knowledge carry across sessions)?
7. How tightly is it **coupled to one model** (open/portable vs. single-model fidelity)?

## 5. How This Applies to agnet-project — Concrete Rules Added

Added to [[CLAUDE.md]] §2 Hard Rules:

> **No agent grades its own work.** Verification of an agent's output must come from a
> genuinely separate agent or process, never from the same agent self-certifying. This is already
> structurally true for the courtroom pipeline (judges are separate from advocates) — this rule
> makes it explicit and extends it to our own build: the testing agent must be independent from
> whichever agent (backend/frontend) produced the thing it's checking. *(Module 5)*

Extended the existing Module 3 tool-boundary rule with the missing third clause:

> ...and **do less when uncertain** — if it's unclear whether a sub-agent should take an action,
> default to not taking it (or asking) rather than proceeding. *(Modules 3, 5)*

Reference material, not a new rule — will be used rather than restated:
- The **six-pillar table** (§1) is the vocabulary we'll use in `docs/architecture.md` (once
  written) to describe what our own courtroom pipeline actually is: essentially bare-model calls
  (via OpenRouter) with no tool augmentation for the advocates/judges themselves — they reason
  over given text and return text, nothing more. Worth stating explicitly since it's a deliberate
  simplicity choice, not an oversight.
- The **seven-question checklist** (§4) is what we should run whenever we pick or configure a
  tool for this project (OpenRouter itself, whatever hosts the backend, etc.) — flag this in
  `docs/agents/devops.md` once that file exists.
