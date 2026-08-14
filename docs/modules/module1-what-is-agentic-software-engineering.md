# Module 1 — What Is Agentic Software Engineering?

> Source: `lessons/ASE26 lesson 1 111.pptx` (ASE-26, Lesson 1, 07.07.2026, Mikael Gorsky) + the
> module description the user gave in chat. This file is the canonical write-up — read this
> instead of re-opening the slides.

## 1. Course Shape (context for later modules)

19 modules in 4 parts. Grading (per the deck): **"I grade how well you direct the agent — not
the app you ship."** Only what's in the repo and verifiable counts, no verbal claims. Split into
thirds: class engagement, a running class project, and this project (agnet-project). From
**Module 6 onward the class builds one running project** — meaning modules 6+ will land directly
on agnet-project as concrete build work, not just theory.

- **Part 1 — Ontology** (Modules 1–5): the mental models the rest depends on.
- **Part 2 — Environment** (Modules 6–9): setup + project conception (this is where our project
  officially starts, per the course).
- **Part 3 — The craft** (Modules 10–17): one dimension of "a turn" per module — spec, context
  engineering, version control, verification, decomposition, multi-agent workflows, review/quality,
  security. Directly maps onto how we should build agnet-project's agent pipeline.
- **Part 4 — Market** (Modules 18–19): career/economic context, not build content.

Recommended toolbox from the deck (not mandatory, equivalents allowed): **Claude Code** (the
"ADE" — agentic development environment), **GitHub**, **Netlify** (deploy/host), **Supabase**
(backend: DB, auth, storage), **OpenRouter** (universal LLM API). We've already chosen OpenRouter
independently — this confirms it's squarely the toolset the course expects.

## 2. Module 1 Core Content

### The central claim
Agentic software engineering is **a discipline shift, not a tooling shift** — the latest in a
~70-year line of handovers from human to machine (switches/wiring in the 1940s → assembler →
high-level languages → structured/OOP/design patterns → prebuilt-component assembly → statistical
next-token completion → generative "whole function from a description" in the early 2020s → the
agent loop now). **Every handover moved skill, it never removed it** — each one left behind a new
named discipline (structured programming after the compiler, software architecture once systems
got large, "read the suggestion critically" once completion tools arrived). Agentic software
engineering is this arc's next discipline, and it has "stated, teachable rules," not just tool
fluency.

### The speed-vs-trust gap (why the discipline is needed now)
- An agent can produce in an afternoon what used to take a week — but "done" only means *it looks
  done to the agent*. Code can compile and pass every test and still do the wrong thing.
- Evidence cited (mid-2026): **>2/3 of agent-generated changes in one study sat delayed in review
  or were never reviewed**; in another study, a model's apparent success rate on real bugs fell
  from **12% headline → 4% under careful audit**; surveyed adopting orgs ranked **trust/
  reliability as the #1 obstacle** to adoption — ahead of legacy systems, weak evaluation, or
  skill gaps.
- The failure mode: output arrives faster than it can be checked, building a backlog of changes
  that *look* finished and aren't.

### The whole course in one sentence
"Do not ask an agent for software and hope." A casual user asks and hopes. **An engineer equips
the agent before it acts, and verifies what it returns after.** Equipping lowers the odds the
agent goes wrong at all; verifying catches what slips through anyway before it enters the project.
Every later module is one part of equipping or one part of verifying.

### Equipping — five parts (each gets its own later module)
1. **The right problem** — aim at the thing actually worth doing; most failure starts here.
2. **The right context** — project standards, relevant files, lessons from earlier work.
3. **The right limits** — boundaries on what it may change, and when it must stop and ask.
4. **The right specification** — precise enough to act on: a written statement of what "good"
   looks like, before the agent starts.
5. **The right tools/permissions** — an agent acts only through what it's given; excess access
   widens the blast radius of any mistake.

### Verifying — instruments (each answers a specific failure mode, none optional)
- **Tests** — behavior vs. what was wanted, case by case.
- **Type checks** — catch a whole class of mistake before the program ever runs.
- **Human reading** — catches what no test was written for.
- **The gate** — the barrier work must clear before it's allowed into the project (no gate, no
  merge — this becomes Module 13's subject).

### How agents specifically fail (why verification isn't optional)
- **Confabulation** — states something plausible and false (e.g. calling a function that doesn't
  exist) with the same confidence as everything true.
- **Wrong-problem solving** — fills gaps in an ambiguous instruction with the wrong reading, and
  solves a different problem than intended.
- **Sycophancy** — agrees with a mistaken suggestion rather than correcting it, because agreement
  is the path of least resistance.
These aren't rare edge cases — the deck's framing is that they're common enough that no check
targeting them is optional.

### The autonomy scale
| Level | Description |
|---|---|
| 1 | Engineer writes every line, no model involvement |
| 1.5 | Model completes next characters, each accepted/rejected individually |
| 2 | Model writes a whole function from a given signature |
| **3** | Model takes a goal, plans steps, edits many files, runs commands, then returns — **this is where today's agentic environments (incl. Claude Code) operate, and what this course assumes** |
| 4 | Autonomy within one specialized domain |
| 5 | Autonomy across many domains — still speculative |

Average autonomy in research literature rose from ~2.3 (2022) to ~3.8 (2024) — the systems in use
keep climbing this scale. **A higher level isn't "a better tool" — it's a tool that decides more
and must be checked with correspondingly more care.** Knowing what level the tool in front of you
sits at is called out as "the first practical skill of the discipline."

### The "north star": what counts as good software
Good software isn't "it runs" — the deck ties it to actual industry-standard qualities: **fit for
its intended use, reliable (works steadily and recovers from failure), secure, maintainable,
usable, performant, compatible, safe, portable.** This is the bar equipping+verifying is aimed at.

### The worked example (casual vs. engineered)
Task: "add password reset." Casual: type "add password reset," watch it run, move on — the agent
alone decides link delivery, expiry, whether it leaks which accounts exist, what happens on reuse.
Several of those guesses are reasonable *and wrong*, and the cost shows up days later. Engineered:
write the wanted outcome in testable terms first ("works once, then expires, reveals nothing about
account existence"), set limits on what the agent may touch, hand it only the account model + mail
system it needs, then check the result point-by-point against the written outcome — not against
"it runs." **Same agent, same task, same afternoon — the difference is entirely structure, not
prompt cleverness.**

### On the objection "structure takes longer"
Framing/spec/checking cost time up front, but that cost is what lets the early speed *survive* to
the end of the task — skip it and the agent's raw pace just produces a backlog that has to be
reopened and redone later. "That saving is real only if speed is measured at the first hour and
nowhere else."

### On "vibe coding" as a term
Coined by Andrej Karpathy (Feb 2025 tweet, "fully give in to the vibes... forget that the code
even exists" — 4.5M views); listed on Merriam-Webster as slang/trending by March 2025. The deck's
take: useful as a label for the casual, no-structure version of the activity, **misleading as a
guide** — because it implies "speak a wish, receive a finished program." The course's name for the
professional version — producing software fit to actually keep and maintain — is *agentic
software engineering*, and that's the discipline being taught, not "vibe coding" literally.

## 3. How This Applies to agnet-project

This module is why [[CLAUDE.md]] leads with "keep the implementation simple, the grading target
is agent-direction skill" — that's a direct restatement of the deck's grading rule ("I grade how
well you direct the agent — not the app you ship") and the equip/verify framing. Concretely, for
our courtroom simulator:

- **Equipping maps directly onto our advocate agents.** Each of the 4 advocate system prompts
  (2 defense, 2 prosecution) is itself an "equipping" exercise: right problem (argue this specific
  stance persuasively), right context (the case facts), right limits (single-shot, stay in
  character, argue only its assigned side), right specification (what a good argument for that
  agent looks like). Weak system prompts here are exactly the "casual" failure mode from the
  worked example — treat writing them with the same rigor as the password-reset example, not as
  "type a vibe and hope."
- **Verifying maps onto the testing agent we're planning.** Per this module, "no gate, no merge"
  — our testing agent's job is the gate: check each advocate output actually argues its assigned
  stance/strategy (catches wrong-problem-solving), check judges actually received the full bundle
  (catches a plumbing bug looking like a content bug), and don't accept "it produced text" as
  success — check it against a written spec of what a correct run looks like. This should be
  written up in `docs/agents/testing.md` once created.
- **Autonomy level:** our own build process (using Claude Code / sub-agents to write
  frontend/backend/testing/devops) runs at Level 3 on the scale above. Per the module, that means
  *we* are responsible for checking with correspondingly more care — an argument for the multi-doc
  rules structure ([[pref-project-docs-structure]]) and for a real testing/devops gate, not just a
  backend agent that reports "done."
- **Documentation counts as part of the grade** ("schedule and documentation count, not just the
  build") — reinforces why we're keeping this `docs/` + `CLAUDE.md` structure current rather than
  relying on chat history.
- Later modules (10–17 especially: spec, context engineering, decomposition, multi-agent
  workflows, review/quality, security) will each add a concrete rule to how we build
  agnet-project's agent team — this file will get cross-linked from those as they land.

## 4. Open Follow-ups From This Module

- [ ] When Module 6 (project conception) lands, revisit whether agnet-project's fixed case /
      scope counts as satisfying that module's "intent and project conception" step, or whether
      it needs a formal spec pass.
- [ ] Module 15 ("Designing multi-agent workflows") will likely directly inform our defense/
      prosecution/judge orchestration — flag it when it arrives.
- [ ] Module 17 (security) should touch prompt-injection risk in the judge bundle (a defense/
      prosecution agent's output is untrusted input to the judges) — flag it when it arrives.
