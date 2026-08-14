# ADR-0002: Split Project Docs Into Many Small Files, Not One Big One

**Status:** Accepted (2026-08-12), reinforced (2026-08-14)
**Modules:** 11 (context engineering — confirmed this after the fact)

## Context

The project needs written documentation covering the concept, architecture, rules, and per-module
notes. The first question was structural: one large file, or several small ones.

## Options Considered

**A. One combined `PROJECT_KNOWLEDGE.md` file with everything in it.**
Simplest to search (one file, `Ctrl+F`), no risk of a fact living in the "wrong" file. But it mixes
audiences: a future backend-focused agent would have to read frontend/testing content to get to
its own rules, and the file only grows — nothing about its structure encourages trimming.

**B. Many small, topic-scoped files, linked from one short entry point. (Chosen)**
`CLAUDE.md` stays the short entry point; deeper content (`docs/framing.md`, `docs/architecture.md`,
`docs/rules/*.md`, `docs/modules/*.md`) lives in scoped files a reader (or sub-agent) opens only
when relevant to its job.

## Decision

Option B — many small files, one short entry point.

## Why It's Better Than the Alternative

At the time (2026-08-12) this was a judgment call based on the stated goal: future
frontend/backend/testing/devops sub-agents should each read a small, targeted file relevant to
their job, not one large document mixing everything.

**[Module 11](../modules/module11-context-engineering.md) (taught 2026-08-14) confirmed this with
real data, after the fact:** the module states that an auto-loaded context file costs tokens and
attention on *every single call*, recommends keeping the root file under ~200 lines, and that
critical rules get lost if buried in a long document. `CLAUDE.md` had in fact grown to 223 lines
by the time that module landed and needed trimming — direct evidence that the single-file approach
(Option A) would have been worse at real scale, not just less tidy.

## Consequences

- More files to keep in sync — mitigated by [`docs/rules/context-and-docs-hygiene.md`](../rules/context-and-docs-hygiene.md)'s
  "review on a schedule" rule and by `docs/decisions-log.md` tracking what changed and why.
- Cross-references (`[[CLAUDE.md]]` §2, etc.) need to stay accurate as files move — a real cost,
  accepted because it's cheaper than re-reading a 200+ line file on every session.
