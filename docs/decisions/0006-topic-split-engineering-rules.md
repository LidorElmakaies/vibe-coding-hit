# ADR-0006: Split Engineering Rules by Topic Instead of One Flat List

**Status:** Accepted (2026-08-14)
**Modules:** 11 (context engineering)

## Context

Each class module that produced a concrete rule was initially appended to one flat "Hard Rules"
list in `CLAUDE.md`. By Modules 8–9, that list held 10+ entries covering agent design, security,
audit trails, cost, and interfaces — unrelated concerns interleaved together.

## Options Considered

**A. Keep appending to the one flat list in `CLAUDE.md`.**
Simplest — one place to look. But the list mixes concerns a reader usually only needs one of at a
time (a security question doesn't need cost-and-performance rules in the way), and it makes
`CLAUDE.md` itself grow without bound — directly working against
[Module 11](../modules/module11-context-engineering.md)'s later guidance to keep the auto-loaded
root file short.

**B. Split into topic files under `docs/rules/`, linked from a short pointer in `CLAUDE.md`.
(Chosen)**
More files, but each is scoped to one concern (agent design, security, audit/reliability, cost,
interface/docs, and later context-hygiene), and `CLAUDE.md` itself stays a table of contents
instead of the content.

## Decision

Option B — five (later six) topic files under `docs/rules/`, each tagged with its source module(s).

## Why It's Better Than the Alternative

Same underlying logic as [ADR-0002](0002-multi-file-documentation-structure.md): a reader (human
or sub-agent) working on, say, the frontend interface doesn't need to load the cost-and-performance
rules to find the one relevant rule about screen specs. This was made explicitly at Modules 8–9
rather than from the start, once the flat list's real growth curve became visible — an example of
[Module 10](../modules/module10-specification-and-co-evolution-spiral.md)'s "commit points" idea:
the decision to split was made once real growth (not just a hypothetical) confirmed it was needed,
not preemptively.

## Consequences

- `CLAUDE.md` §2 is now two short sections (Assignment Constraints + a pointer list) instead of one
  long list — verified back under Module 11's ~200-line guideline once this and the Module 11 trim
  both landed (see `docs/decisions-log.md`, 2026-08-14).
- Six files to keep individually short and current instead of one — the same tradeoff already
  accepted in ADR-0002.
