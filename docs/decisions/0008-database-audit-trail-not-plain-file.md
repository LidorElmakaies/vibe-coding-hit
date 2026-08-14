# ADR-0008: Persist the Audit Trail in a Database, Not a Plain Log File

**Status:** Proposed — direction chosen, SQL vs. NoSQL still deliberately open
**Modules:** 4 (audit trail requirement), 7 (poses this exact question)

## Context

Every run needs a persisted audit trail: the case, all 4 advocate outputs, all 3 verdicts, and a
call-log row per model call (model, tokens, cost, time) — required by [Module 4](../modules/module4-anatomy-of-agentic-workflow.md).
[Module 7](../modules/module7-web-application-architecture.md) poses the alternative directly, as
a question worth sitting with rather than assuming: **"why not just keep that audit trail in a
plain file?"**

## Options Considered

**A. A plain append-only log file (e.g. JSON Lines on disk).**
Trivial to implement, human-readable, no schema to design up front. But it can't support the
confirmed Tribunal scope (ADR-0005): a past-cases list needs to *query* — find one case among many,
filter, look up a specific run — which a flat file only supports by scanning the whole thing. It
also doesn't naturally support the "atomic — all or none" guarantee Module 7 names for a database
(a partially-written run during a crash leaves a log file in an ambiguous state).

**B. A database (exact engine TBD — SQL or NoSQL). (Chosen direction)**
Supports lookup by case, structured querying for the past-cases list, and atomic writes per run.
Requires an actual schema/document-shape decision eventually — sketched in `docs/architecture.md`
§3 but deliberately not finalized.

## Decision

Direction: a database, not a plain file — matches Module 7's own reasoning. **The SQL-vs-NoSQL
choice within that is intentionally deferred**, per Module 7's own explicit permission to do so:
"know that both exist, the choice can wait." This isn't indecision; it's following the module's
guidance not to over-decide before the shape of real usage (query patterns, hosting choice) is
known.

## Why It's Better Than the Alternative

- The confirmed Tribunal scope (ADR-0005) requires case lookup and a past-cases list — a
  requirement a plain file structurally can't serve well past a handful of runs.
- Atomicity matters here specifically because a partial write (e.g. 3 of 4 advocate outputs saved
  before a crash) must never be mistaken for a complete run — a database gives that guarantee
  where a flat file doesn't.

## Consequences

- An actual schema (or document shape) still has to be chosen before the backend can be built —
  tracked as an open item in [[CLAUDE.md]] §6 and `docs/architecture.md` §5, not resolved by this
  ADR.
- Slightly more setup than a log file (a real database to provision/host) — accepted because the
  Tribunal scope decision (ADR-0005) already committed to needing this.
