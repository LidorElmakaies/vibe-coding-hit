# Documentation Brief — Backend Orchestrator

> Produced per [Module 8](modules/module8-interface-design-and-documentation.md)'s required
> deliverable: a documentation brief for one component, commissioned as a brief (audience,
> purpose, required sections, decisions to explain) rather than a blank "write docs for this."
> Component chosen: the backend orchestrator — the piece that runs the 7 model calls per
> deliberation — since it carries the most decisions a future reader would need explained and
> can't get from the code alone. This brief is written now, before the component exists, per
> Module 8's "document from the beginning" — whichever agent (or the student) builds the
> orchestrator should write the actual documentation against this brief.

## Audience

Someone picking this code up later without having watched it get built — most realistically: the
student themself in a month, or a grader reading the repo. Assume they know the project's overall
shape (`CLAUDE.md`, `docs/architecture.md`) but not this file's internal choices.

## Purpose

Let that reader trust and modify the orchestrator without re-deriving *why* it's shaped the way it
is — which calls block on which, why failures are handled the way they are, why the cost/latency
tradeoffs landed where they did.

## Required Sections

1. **What it does** (descriptive — an agent can write this well once the code exists): the 7
   calls it makes, in what order/grouping, what it reads and writes.
2. **Why it's staged the way it is** (explanatory — must come from us): advocates run in parallel
   because they don't depend on each other; judges wait for all 4 advocates because they need the
   full bundle (see [`docs/rules/audit-and-reliability.md`](rules/audit-and-reliability.md)); this
   is a deliberate cost/latency choice, not an accident — see
   [`docs/rules/cost-and-performance.md`](rules/cost-and-performance.md) for the ~21s vs. ~6s
   reasoning.
3. **Why the failure handling is shaped the way it is** (explanatory): what "check the shape, then
   retry/fall back, then show failure as failure" actually means for this component — which
   failures get retried, how many times, and what a permanently-failed slot writes to the audit
   trail. This is a decision we have to supply; an agent asked to "add error handling" will invent
   a plausible-but-arbitrary policy instead.
4. **Why the calls-per-deliberation cap exists and what it's set to** (explanatory): the economic
   blast-radius reasoning from [Module 9](modules/module9-cognified-software-and-agent-economics.md),
   plus the actual chosen number once decided (currently open — see `CLAUDE.md` §6).
5. **What must never change without review** (explanatory): that secrets/system prompts never
   leave this component (see
   [`docs/rules/security-and-permissions.md`](rules/security-and-permissions.md)), and that the
   3 judge prompts are the teacher's verbatim text — a future edit to "improve" a judge prompt
   would violate a project rule, not just a style choice.

## Decisions the Text Must Explain (the actual "why" list to supply, not delegate)

- Why 4 advocates + 3 judges, not some other split (this is the assignment's shape — point back to
  `docs/framing.md`, don't re-argue it here).
- Why single-shot, no shared context between advocate calls (see `CLAUDE.md` §2).
- Why prompt caching is applied to the charge sheet specifically, and not (yet) to anything else.
- Why the audit trail persists per-call token/cost/time rather than only a final summary.

## Explicit Non-Goals For This Documentation

Don't let it turn into a restatement of `docs/architecture.md` or `CLAUDE.md` — this brief is for
the orchestrator component specifically; link back to those files for anything already covered
there instead of duplicating it.
