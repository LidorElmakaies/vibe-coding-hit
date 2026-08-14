# ADR-0005: Build a Reusable Web App, Not a One-Off Script Over One Fixed Case

**Status:** Accepted (2026-08-14)
**Modules:** 7 (web application architecture)

## Context

The assignment describes one fixed case. The simplest thing that satisfies the literal words is a
script: hardcode the case, run the 7 calls once, print 3 verdicts. But [Module 7](../modules/module7-web-application-architecture.md)
teaches its entire request-cycle lesson through a running example — "the Tribunal" — that submits
a charge sheet through a browser form and stores every case + opinion for later lookup. That's a
reusable app, not a one-off script, and it's clearly not a coincidence: it's this course's own
name for this exact project.

## Options Considered

**A. A one-off script: hardcode the fixed case, run once, print/log 3 verdicts.**
Fastest to build, satisfies the literal assignment text with the least code. But it doesn't
exercise anything Module 7 teaches (browser/backend/database split, the request cycle, a
past-cases list) — and it directly contradicts what the course's own worked example is showing us
to build alongside it.

**B. A reusable web app: submit a case through a form, browse past cases, matching Module 7's
"Tribunal." (Chosen)**
More to build (a real frontend, a database, a request cycle worth diagramming) — but it's what the
course is actually teaching toward, confirmed directly by the user (see
`docs/decisions-log.md`, 2026-08-14) rather than inferred alone.

## Decision

Option B, confirmed with the user before committing to it (this was flagged as a genuine fork,
not decided unilaterally — see the question asked in that session).

## Why It's Better Than the Alternative

- Matches what the course is visibly building toward across its own modules — a script that never
  needs a browser, a database, or a request cycle would make several *already-taught* modules
  (7, and implicitly the deployment/security modules still ahead) inapplicable to this project,
  which can't be right given how tightly Module 7's own example matches ours.
- "Keep the stack minimal" ([[CLAUDE.md]] §2) doesn't mean "build the least possible" — it means
  don't add infrastructure the learning goal doesn't call for. A browser + backend + database
  *is* what Module 7's learning goal calls for, so building it isn't scope creep, it's the
  assignment.

## Consequences

- Real frontend and database work is now in scope that a script would have avoided — reflected in
  `docs/framing.md` (definition of done, item 6) and `docs/architecture.md` (browser role, past-
  cases list).
- Two new deliverables became necessary sooner: an interface brief and a documentation brief for
  real screens/components (Module 8) — these wouldn't have been needed for a script.
